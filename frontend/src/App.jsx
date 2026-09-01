import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentList } from './pages/Students/StudentList';
import { AttendanceMarker } from './pages/Attendance/AttendanceMarker';
import { FeeCollection } from './pages/Fees/FeeCollection';
import { MarksEntry } from './pages/Exams/MarksEntry';
import { DayBook } from './pages/Finance/DayBook';
import { CMSManager } from './pages/CMS/CMSManager';
import { ExcelMigration } from './pages/Migration/ExcelMigration';
import { DocumentCenter } from './pages/Documents/DocumentCenter';
import { ReportsCenter } from './pages/Reports/ReportsCenter';
import { ParentDashboard } from './pages/ParentPortal/ParentDashboard';
import { TenantsList } from './pages/SuperAdmin/TenantsList';
import { SchoolPublicWebsite } from './pages/PublicWebsite/SchoolPublicWebsite';
import { SaaSLandingPage } from './pages/SaaSLanding/SaaSLandingPage';
import { TimetableSyllabusView } from './pages/Academics/TimetableSyllabusView';

export const App = () => {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <Routes>
            <Route path="/landing" element={<SaaSLandingPage />} />
            <Route path="/website" element={<SchoolPublicWebsite />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Staff ERP Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<StudentList />} />
              <Route path="students/admit" element={<StudentList />} />
              <Route path="academics/timetable" element={<TimetableSyllabusView />} />
              <Route path="attendance" element={<AttendanceMarker />} />
              <Route path="fees" element={<FeeCollection />} />
              <Route path="exams" element={<MarksEntry />} />
              <Route path="finance" element={<DayBook />} />
              <Route path="migration" element={<ExcelMigration />} />
              <Route path="documents" element={<DocumentCenter />} />
              <Route path="reports" element={<ReportsCenter />} />
              <Route path="cms" element={<CMSManager />} />
              <Route path="parent-portal" element={<ParentDashboard />} />
              <Route path="superadmin" element={<TenantsList />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
};
