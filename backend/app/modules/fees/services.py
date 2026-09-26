import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.exceptions import AppException, ResourceNotFoundException, FinancialImmutabilityException
from app.modules.students.models import Student, StudentEnrollment
from app.modules.academics.models import ClassLevel, Section, AcademicYear
from app.modules.lookups.models import PaymentMode
from app.modules.fees.models import (
    FeeHead,
    FeeStructure,
    FeeStructureItem,
    FeeInstallmentSchedule,
    FeeConcessionType,
    StudentFeeConcession,
    StudentFeeDemand,
    FeeCollection,
    FeeCollectionItem,
    FeeRefund,
    StudentAdvanceWallet,
    StudentAdvanceWalletTransaction,
)
from app.modules.fees.schemas import (
    CollectFeePaymentRequest,
    GenerateBulkFeeDemandsRequest,
    FeeStructureCreate,
    WaiveFeeDemandsRequest,
)


class FeeService:
    @staticmethod
    async def _generate_receipt_no(db: AsyncSession) -> str:
        """Generates sequential receipt number: e.g. RCP-2026-0001"""
        stmt = select(func.count(FeeCollection.id))
        result = await db.execute(stmt)
        count = result.scalar() or 0
        year = date.today().year
        return f"RCP-{year}-{(count + 1):04d}"

    @classmethod
    async def create_fee_structure(cls, req: FeeStructureCreate, db: AsyncSession) -> FeeStructure:
        """Creates or replaces a fee structure for a class in an academic session."""
        # Check existing
        stmt = select(FeeStructure).where(
            FeeStructure.academic_year_id == req.academic_year_id,
            FeeStructure.class_id == req.class_id,
        )
        res = await db.execute(stmt)
        structure = res.scalar_one_or_none()

        total_annual = Decimal("0.00")
        for item in req.items:
            multiplier = 12 if item.frequency == "MONTHLY" else (4 if item.frequency == "QUARTERLY" else 1)
            total_annual += (item.amount * multiplier)

        if not structure:
            structure = FeeStructure(
                academic_year_id=req.academic_year_id,
                class_id=req.class_id,
                name=req.name,
                total_annual_amount=total_annual,
            )
            db.add(structure)
            await db.flush()
        else:
            structure.name = req.name
            structure.total_annual_amount = total_annual
            # Delete old items
            await db.execute(
                FeeStructureItem.__table__.delete().where(FeeStructureItem.fee_structure_id == structure.id)
            )

        for item_input in req.items:
            item_obj = FeeStructureItem(
                fee_structure_id=structure.id,
                fee_head_id=item_input.fee_head_id,
                amount=item_input.amount,
                frequency=item_input.frequency,
            )
            db.add(item_obj)

        await db.commit()
        await db.refresh(structure)
        return structure

    @classmethod
    async def generate_bulk_fee_demands(cls, req: GenerateBulkFeeDemandsRequest, db: AsyncSession) -> int:
        """
        Generates individual fee demands for all active enrolled students
        in the specified session and installment schedule.
        """
        # 1. Fetch schedule
        sched_stmt = select(FeeInstallmentSchedule).where(FeeInstallmentSchedule.id == req.installment_schedule_id)
        sched_res = await db.execute(sched_stmt)
        schedule = sched_res.scalar_one_or_none()
        if not schedule:
            raise ResourceNotFoundException("FeeInstallmentSchedule", req.installment_schedule_id)

        # 2. Query target classes
        class_query = select(ClassLevel)
        if req.class_id:
            class_query = class_query.where(ClassLevel.id == req.class_id)
        class_res = await db.execute(class_query)
        target_classes = class_res.scalars().all()

        demands_created = 0

        for target_class in target_classes:
            # Get class fee structure
            struct_stmt = (
                select(FeeStructure)
                .options(selectinload(FeeStructure.items).joinedload(FeeStructureItem.fee_head))
                .where(
                    FeeStructure.academic_year_id == req.academic_year_id,
                    FeeStructure.class_id == target_class.id,
                )
            )
            struct_res = await db.execute(struct_stmt)
            structure = struct_res.scalar_one_or_none()
            if not structure:
                continue

            # Query active enrolled students in this class
            students_stmt = (
                select(StudentEnrollment.student_id)
                .where(
                    StudentEnrollment.academic_year_id == req.academic_year_id,
                    StudentEnrollment.class_id == target_class.id,
                    StudentEnrollment.is_active == True,
                )
            )
            st_res = await db.execute(students_stmt)
            student_ids = st_res.scalars().all()

            for student_id in student_ids:
                # Fetch any student concessions
                conc_stmt = (
                    select(StudentFeeConcession)
                    .options(selectinload(StudentFeeConcession.concession_type))
                    .where(
                        StudentFeeConcession.student_id == student_id,
                        StudentFeeConcession.academic_year_id == req.academic_year_id,
                    )
                )
                conc_res = await db.execute(conc_stmt)
                concessions = conc_res.scalars().all()

                for item in structure.items:
                    # Check if demand already exists
                    existing = await db.execute(
                        select(StudentFeeDemand).where(
                            StudentFeeDemand.student_id == student_id,
                            StudentFeeDemand.installment_schedule_id == schedule.id,
                            StudentFeeDemand.fee_head_id == item.fee_head_id,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                    base_amt = Decimal(str(item.amount))
                    concession_amt = Decimal("0.00")

                    # Calculate applicable concession
                    for conc in concessions:
                        if conc.fee_head_id is None or conc.fee_head_id == item.fee_head_id:
                            if conc.concession_type.discount_type == "PERCENTAGE":
                                concession_amt += (base_amt * (Decimal(str(conc.concession_type.discount_value)) / Decimal("100.00")))
                            else:
                                concession_amt += Decimal(str(conc.concession_type.discount_value))

                    concession_amt = min(concession_amt, base_amt)
                    net_demand = base_amt - concession_amt

                    demand = StudentFeeDemand(
                        student_id=student_id,
                        academic_year_id=req.academic_year_id,
                        installment_schedule_id=schedule.id,
                        fee_head_id=item.fee_head_id,
                        base_amount=base_amt,
                        concession_amount=concession_amt,
                        fine_amount=Decimal("0.00"),
                        net_demand_amount=net_demand,
                        paid_amount=Decimal("0.00"),
                        balance_amount=net_demand,
                        status="UNPAID",
                    )

                    # Auto-offset from StudentAdvanceWallet if credit is available
                    wallet_stmt = select(StudentAdvanceWallet).where(StudentAdvanceWallet.student_id == student_id)
                    wallet_res = await db.execute(wallet_stmt)
                    wallet = wallet_res.scalar_one_or_none()
                    if wallet and Decimal(str(wallet.credit_balance)) > Decimal("0.00"):
                        avail_credit = Decimal(str(wallet.credit_balance))
                        offset = min(avail_credit, net_demand)
                        if offset > Decimal("0.00"):
                            demand.paid_amount = offset
                            demand.balance_amount = net_demand - offset
                            demand.status = "PAID" if demand.balance_amount == Decimal("0.00") else "PARTIALLY_PAID"
                            wallet.credit_balance = avail_credit - offset

                            db.add(demand)
                            await db.flush()

                            advance_tx = StudentAdvanceWalletTransaction(
                                wallet_id=wallet.id,
                                transaction_type="CREDIT_OFFSET",
                                amount=offset,
                                running_balance=wallet.credit_balance,
                                student_fee_demand_id=demand.id,
                                notes=f"Auto-settled from advance wallet credit for {schedule.name}",
                            )
                            db.add(advance_tx)
                            demands_created += 1
                            continue

                    db.add(demand)
                    demands_created += 1

        await db.commit()
        return demands_created

    @classmethod
    async def collect_fee_payment(
        cls,
        req: CollectFeePaymentRequest,
        cashier_user_id: str,
        db: AsyncSession,
    ) -> FeeCollection:
        """
        Executes Penny-Perfect FIFO Ledger Allocation:
        1. Queries unpaid/partially paid demands ordered by Due Date ASC and Fee Head Priority Order ASC.
        2. Progressively clears demands down to 0.00 balance.
        3. Creates immutable FeeCollection & FeeCollectionItem records.
        """
        amount_to_allocate = Decimal(str(req.total_amount_paid))
        if amount_to_allocate <= Decimal("0.00"):
            raise AppException("Payment amount must be greater than zero")

        # 1. Query pending demands across sessions in FIFO order (prioritizing past arrears chronologically)
        demands_stmt = (
            select(StudentFeeDemand)
            .join(FeeInstallmentSchedule, StudentFeeDemand.installment_schedule_id == FeeInstallmentSchedule.id)
            .join(FeeHead, StudentFeeDemand.fee_head_id == FeeHead.id)
            .join(AcademicYear, StudentFeeDemand.academic_year_id == AcademicYear.id)
            .where(
                StudentFeeDemand.student_id == req.student_id,
                StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
            )
            .order_by(AcademicYear.start_date.asc(), FeeInstallmentSchedule.due_date.asc(), FeeHead.priority_order.asc())
        )
        demands_res = await db.execute(demands_stmt)
        pending_demands = demands_res.scalars().all()

        # 2. Create FeeCollection Receipt Header
        receipt_no = await cls._generate_receipt_no(db)
        collection = FeeCollection(
            receipt_no=receipt_no,
            student_id=req.student_id,
            academic_year_id=req.academic_year_id,
            collection_date=req.collection_date or date.today(),
            total_amount_paid=amount_to_allocate,
            payment_mode_id=req.payment_mode_id,
            transaction_reference_no=req.transaction_reference_no,
            collected_by_user_id=cashier_user_id,
            remarks=req.remarks,
            status="CONFIRMED",
        )
        db.add(collection)
        await db.flush()

        remaining = amount_to_allocate

        # If student has zero pending demands, credit full deposit into StudentAdvanceWallet
        if not pending_demands:
            wallet_res = await db.execute(
                select(StudentAdvanceWallet).where(StudentAdvanceWallet.student_id == req.student_id)
            )
            wallet = wallet_res.scalar_one_or_none()
            if not wallet:
                wallet = StudentAdvanceWallet(student_id=req.student_id, credit_balance=Decimal("0.00"))
                db.add(wallet)
                await db.flush()

            wallet.credit_balance = Decimal(str(wallet.credit_balance)) + remaining
            advance_tx = StudentAdvanceWalletTransaction(
                wallet_id=wallet.id,
                transaction_type="CREDIT_ADDED",
                amount=remaining,
                running_balance=wallet.credit_balance,
                fee_collection_id=collection.id,
                notes=f"Advance fee deposit (no pending demands) via {receipt_no}",
            )
            db.add(advance_tx)
            await db.commit()
            await db.refresh(collection)
            return collection

        # 3. FIFO Penny Allocation Loop
        for demand in pending_demands:
            if remaining <= Decimal("0.00"):
                break

            due = Decimal(str(demand.balance_amount))
            allocated = min(remaining, due)

            demand.paid_amount = Decimal(str(demand.paid_amount)) + allocated
            demand.balance_amount = Decimal(str(demand.balance_amount)) - allocated

            if demand.balance_amount == Decimal("0.00"):
                demand.status = "PAID"
            else:
                demand.status = "PARTIALLY_PAID"

            collection_item = FeeCollectionItem(
                fee_collection_id=collection.id,
                student_fee_demand_id=demand.id,
                allocated_base_amount=allocated,
                allocated_fine_amount=Decimal("0.00"),
                total_allocated_amount=allocated,
            )
            db.add(collection_item)

            remaining -= allocated

        # 4. If any excess payment remains after clearing all pending demands, credit to StudentAdvanceWallet
        if remaining > Decimal("0.00"):
            wallet_res = await db.execute(
                select(StudentAdvanceWallet).where(StudentAdvanceWallet.student_id == req.student_id)
            )
            wallet = wallet_res.scalar_one_or_none()
            if not wallet:
                wallet = StudentAdvanceWallet(student_id=req.student_id, credit_balance=Decimal("0.00"))
                db.add(wallet)
                await db.flush()

            wallet.credit_balance = Decimal(str(wallet.credit_balance)) + remaining
            advance_tx = StudentAdvanceWalletTransaction(
                wallet_id=wallet.id,
                transaction_type="CREDIT_ADDED",
                amount=remaining,
                running_balance=wallet.credit_balance,
                fee_collection_id=collection.id,
                notes=f"Overpayment excess credit from receipt {receipt_no}",
            )
            db.add(advance_tx)

        await db.commit()
        await db.refresh(collection)
        return collection

    @classmethod
    async def reverse_fee_receipt(
        cls,
        receipt_no: str,
        reversal_reason: str,
        user_id: str,
        db: AsyncSession,
    ) -> FeeCollection:
        """
        Strict Zero-Destructive Deletion:
        Reverses a confirmed fee receipt, restores student fee demands,
        rolls back advance wallet credits, and marks receipt as REVERSED with full audit trail.
        """
        stmt = (
            select(FeeCollection)
            .options(selectinload(FeeCollection.items).joinedload(FeeCollectionItem.demand))
            .where(FeeCollection.receipt_no == receipt_no)
        )
        res = await db.execute(stmt)
        collection = res.scalar_one_or_none()

        if not collection:
            raise ResourceNotFoundException("FeeCollection Receipt", receipt_no)

        if collection.status == "REVERSED":
            raise AppException("This fee receipt is already reversed", "ALREADY_REVERSED")

        # 1. Rollback allocations on each demand
        for item in collection.items:
            demand = item.demand
            if demand:
                allocated = Decimal(str(item.total_allocated_amount))
                demand.paid_amount = max(Decimal("0.00"), Decimal(str(demand.paid_amount)) - allocated)
                demand.balance_amount = Decimal(str(demand.balance_amount)) + allocated

                if demand.paid_amount == Decimal("0.00"):
                    demand.status = "UNPAID"
                else:
                    demand.status = "PARTIALLY_PAID"

        # 2. Rollback any advance wallet credits created from this collection
        wallet_tx_stmt = select(StudentAdvanceWalletTransaction).where(
            StudentAdvanceWalletTransaction.fee_collection_id == collection.id,
            StudentAdvanceWalletTransaction.transaction_type == "CREDIT_ADDED",
        )
        wallet_tx_res = await db.execute(wallet_tx_stmt)
        wallet_txs = wallet_tx_res.scalars().all()
        for wtx in wallet_txs:
            wallet_res = await db.execute(
                select(StudentAdvanceWallet).where(StudentAdvanceWallet.id == wtx.wallet_id)
            )
            wallet = wallet_res.scalar_one_or_none()
            if wallet:
                credit_to_rollback = Decimal(str(wtx.amount))
                current_balance = Decimal(str(wallet.credit_balance))

                if current_balance >= credit_to_rollback:
                    wallet.credit_balance = current_balance - credit_to_rollback
                else:
                    # Credit was partially or fully utilized to settle subsequent demands.
                    # Reopen the demands that consumed this advance credit in reverse chronological order
                    deficit = credit_to_rollback - current_balance
                    wallet.credit_balance = Decimal("0.00")

                    offset_stmt = (
                        select(StudentAdvanceWalletTransaction)
                        .options(selectinload(StudentAdvanceWalletTransaction.demand))
                        .where(
                            StudentAdvanceWalletTransaction.wallet_id == wallet.id,
                            StudentAdvanceWalletTransaction.transaction_type == "CREDIT_OFFSET",
                            StudentAdvanceWalletTransaction.student_fee_demand_id.isnot(None),
                        )
                        .order_by(StudentAdvanceWalletTransaction.created_at.desc())
                    )
                    offset_res = await db.execute(offset_stmt)
                    offset_txs = offset_res.scalars().all()

                    for otx in offset_txs:
                        if deficit <= Decimal("0.00"):
                            break
                        if otx.demand:
                            revert_amt = min(deficit, Decimal(str(otx.amount)))
                            otx.demand.paid_amount = max(Decimal("0.00"), Decimal(str(otx.demand.paid_amount)) - revert_amt)
                            otx.demand.balance_amount = Decimal(str(otx.demand.balance_amount)) + revert_amt
                            otx.demand.status = "UNPAID" if otx.demand.paid_amount == Decimal("0.00") else "PARTIALLY_PAID"
                            deficit -= revert_amt

                rev_tx = StudentAdvanceWalletTransaction(
                    wallet_id=wallet.id,
                    transaction_type="CREDIT_OFFSET",
                    amount=credit_to_rollback,
                    running_balance=wallet.credit_balance,
                    fee_collection_id=collection.id,
                    notes=f"Reversal of advance deposit receipt {collection.receipt_no}",
                )
                db.add(rev_tx)

        # 3. Mark collection as REVERSED
        collection.status = "REVERSED"
        collection.reversal_reason = reversal_reason
        collection.reversed_by_user_id = user_id
        collection.reversed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(collection)
        return collection

    @classmethod
    async def get_student_ledger(
        cls,
        student_id: str,
        academic_year_id: Optional[str] = None,
        db: AsyncSession = None,
    ) -> Dict[str, Any]:
        """Retrieves comprehensive fee ledger / statement of account for student."""
        # 1. Student details
        st_res = await db.execute(select(Student).where(Student.id == student_id))
        student = st_res.scalar_one_or_none()
        if not student:
            raise ResourceNotFoundException("Student", student_id)

        # Query active enrollment
        enr_stmt = (
            select(StudentEnrollment, ClassLevel, Section)
            .join(ClassLevel, StudentEnrollment.class_id == ClassLevel.id)
            .join(Section, StudentEnrollment.section_id == Section.id)
            .where(
                StudentEnrollment.student_id == student_id,
                StudentEnrollment.is_active == True,
            )
        )
        if academic_year_id:
            enr_stmt = enr_stmt.where(StudentEnrollment.academic_year_id == academic_year_id)

        enr_res = await db.execute(enr_stmt)
        enr_row = enr_res.first()

        cls_name = "-"
        sec_name = "-"
        roll_no = None
        resolved_ay_id = academic_year_id

        if enr_row:
            enroll, cls_lvl, sec = enr_row
            cls_name = cls_lvl.name
            sec_name = sec.name
            roll_no = enroll.roll_no
            if not resolved_ay_id:
                resolved_ay_id = enroll.academic_year_id
        else:
            # Fallback to current academic year if needed
            if not resolved_ay_id:
                curr_ay = (await db.execute(select(AcademicYear).where(AcademicYear.is_current == True))).scalar_one_or_none()
                if curr_ay:
                    resolved_ay_id = curr_ay.id

        # 2. Demands
        demands_stmt = (
            select(StudentFeeDemand)
            .options(
                selectinload(StudentFeeDemand.fee_head),
                selectinload(StudentFeeDemand.installment_schedule),
            )
            .where(StudentFeeDemand.student_id == student_id)
        )
        if resolved_ay_id:
            demands_stmt = demands_stmt.where(StudentFeeDemand.academic_year_id == resolved_ay_id)
        demands_stmt = demands_stmt.order_by(StudentFeeDemand.created_at.asc())

        demands_res = await db.execute(demands_stmt)
        demands = demands_res.scalars().all()

        # 3. Receipts
        receipts_stmt = (
            select(FeeCollection)
            .options(
                selectinload(FeeCollection.payment_mode),
                selectinload(FeeCollection.collected_by),
            )
            .where(FeeCollection.student_id == student_id)
        )
        if resolved_ay_id:
            receipts_stmt = receipts_stmt.where(FeeCollection.academic_year_id == resolved_ay_id)
        receipts_stmt = receipts_stmt.order_by(FeeCollection.collection_date.desc(), FeeCollection.created_at.desc())

        receipts_res = await db.execute(receipts_stmt)
        receipts = receipts_res.scalars().all()

        total_demanded = sum(Decimal(str(d.net_demand_amount)) for d in demands)
        total_paid = sum(Decimal(str(d.paid_amount)) for d in demands)
        total_concession = sum(Decimal(str(d.concession_amount)) for d in demands)
        total_fine = sum(Decimal(str(d.fine_amount)) for d in demands)
        net_balance_due = sum(Decimal(str(d.balance_amount)) for d in demands)

        # 4. Advance Fee Wallet
        wallet_res = await db.execute(
            select(StudentAdvanceWallet).where(StudentAdvanceWallet.student_id == student_id)
        )
        wallet = wallet_res.scalar_one_or_none()
        advance_wallet_balance = float(wallet.credit_balance) if wallet else 0.0

        return {
            "student_id": student.id,
            "admission_no": student.admission_no,
            "student_name": f"{student.first_name} {student.last_name or ''}".strip(),
            "class_name": cls_name,
            "section_name": sec_name,
            "roll_no": roll_no,
            "academic_year_id": resolved_ay_id,
            "total_demanded": float(total_demanded),
            "total_concession": float(total_concession),
            "total_fine": float(total_fine),
            "total_paid": float(total_paid),
            "net_balance_due": float(net_balance_due),
            "net_outstanding_balance": float(net_balance_due),
            "advance_wallet_balance": advance_wallet_balance,
            "demands": [
                {
                    "id": d.id,
                    "schedule_name": d.installment_schedule.name if d.installment_schedule else None,
                    "fee_head_name": d.fee_head.name if d.fee_head else None,
                    "base_amount": float(d.base_amount),
                    "concession_amount": float(d.concession_amount),
                    "fine_amount": float(d.fine_amount),
                    "net_demand_amount": float(d.net_demand_amount),
                    "paid_amount": float(d.paid_amount),
                    "balance_amount": float(d.balance_amount),
                    "status": d.status,
                }
                for d in demands
            ],
            "receipts": [
                {
                    "id": r.id,
                    "receipt_no": r.receipt_no,
                    "collection_date": str(r.collection_date),
                    "total_amount_paid": float(r.total_amount_paid),
                    "payment_mode": r.payment_mode.name if r.payment_mode else None,
                    "transaction_reference_no": r.transaction_reference_no,
                    "status": r.status,
                    "reversal_reason": r.reversal_reason,
                }
                for r in receipts
            ],
        }

    @classmethod
    async def process_fee_refund(
        cls,
        student_id: str,
        refund_amount: Decimal,
        payment_mode_id: str,
        reason: str,
        user_id: str,
        fee_collection_id: Optional[str],
        refund_date: Optional[date],
        db: AsyncSession,
    ) -> FeeRefund:
        """
        Processes a fee refund to a student, preserving original collection receipts
        and recording the refund transaction with audit authorization.
        """
        today_date = refund_date or date.today()
        rand_suffix = str(uuid.uuid4())[:6].upper()
        refund_no = f"REF-{today_date.strftime('%Y%m')}-{rand_suffix}"

        refund = FeeRefund(
            refund_no=refund_no,
            student_id=student_id,
            fee_collection_id=fee_collection_id,
            refund_amount=refund_amount,
            refund_date=today_date,
            payment_mode_id=payment_mode_id,
            reason=reason,
            authorized_by_user_id=user_id,
        )
        db.add(refund)
        await db.commit()
        await db.refresh(refund)
        return refund

    @classmethod
    async def get_student_wallet(cls, student_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Retrieves Student Advance Wallet balance and transaction audit history."""
        wallet_res = await db.execute(
            select(StudentAdvanceWallet).where(StudentAdvanceWallet.student_id == student_id)
        )
        wallet = wallet_res.scalar_one_or_none()
        if not wallet:
            return {
                "student_id": student_id,
                "credit_balance": 0.0,
                "transactions": [],
            }

        tx_stmt = (
            select(StudentAdvanceWalletTransaction)
            .where(StudentAdvanceWalletTransaction.wallet_id == wallet.id)
            .order_by(StudentAdvanceWalletTransaction.created_at.desc())
        )
        tx_res = await db.execute(tx_stmt)
        transactions = tx_res.scalars().all()

        return {
            "id": wallet.id,
            "student_id": wallet.student_id,
            "credit_balance": float(wallet.credit_balance),
            "transactions": [
                {
                    "id": tx.id,
                    "transaction_type": tx.transaction_type,
                    "amount": float(tx.amount),
                    "running_balance": float(tx.running_balance),
                    "fee_collection_id": tx.fee_collection_id,
                    "student_fee_demand_id": tx.student_fee_demand_id,
                    "notes": tx.notes,
                    "created_at": str(tx.created_at),
                }
                for tx in transactions
            ],
        }

    @classmethod
    async def waive_fee_demands(
        cls,
        req: WaiveFeeDemandsRequest,
        principal_user_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Principal Fee Waiver Authorization (FIX-08):
        Authorizes waiver of fee demands (e.g. for EWS hardship or Transfer Certificate clearance).
        Zeros out balance_amount, marks status='WAIVED', records audit trail.
        """
        stmt = select(StudentFeeDemand).where(
            StudentFeeDemand.student_id == req.student_id,
            StudentFeeDemand.status.in_(["UNPAID", "PARTIALLY_PAID"]),
        )
        if req.demand_ids:
            stmt = stmt.where(StudentFeeDemand.id.in_(req.demand_ids))

        res = await db.execute(stmt)
        demands = res.scalars().all()

        if not demands:
            return {"waived_count": 0, "total_waived_amount": 0.0, "message": "No pending demands found to waive"}

        now = datetime.utcnow()
        total_waived = Decimal("0.00")
        waived_ids = []

        for d in demands:
            waive_amt = Decimal(str(d.balance_amount))
            total_waived += waive_amt
            d.balance_amount = Decimal("0.00")
            d.status = "WAIVED"
            d.waived_by_user_id = principal_user_id
            d.waived_at = now
            d.waiver_reason = req.waiver_reason
            waived_ids.append(d.id)

        await db.commit()
        return {
            "waived_count": len(demands),
            "total_waived_amount": float(total_waived),
            "waived_demand_ids": waived_ids,
            "waiver_reason": req.waiver_reason,
            "waived_at": str(now),
        }

