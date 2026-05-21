import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import { ToastProvider } from './components/ui/Toast';

import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Alunos = lazy(() => import('./pages/admin/Alunos'));
const AlunoDetalhe = lazy(() => import('./pages/admin/AlunoDetalhe'));
const Exercicios = lazy(() => import('./pages/admin/Exercicios'));
const Alimentos = lazy(() => import('./pages/admin/Alimentos'));
const Cardio = lazy(() => import('./pages/admin/Cardio'));
const ProtocoloBuilder = lazy(() => import('./pages/admin/ProtocoloBuilder'));

import AlunoLayout from './pages/aluno/AlunoLayout';
import AlunoHome from './pages/aluno/Home';
import AlunoTreino from './pages/aluno/Treino';
import TreinoExecucao from './pages/aluno/TreinoExecucao';
import AlunoDieta from './pages/aluno/Dieta';
import RefeicaoDetalhe from './pages/aluno/RefeicaoDetalhe';
import AlunoPerfil from './pages/aluno/Perfil';

function AdminShell() {
  return (
    <div className="md:flex min-h-screen bg-surface">
      <Navbar />
      <main className="flex-1 min-w-0">
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Carregando...</div>}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="alunos" element={<Alunos />} />
            <Route path="alunos/:id" element={<AlunoDetalhe />} />
            <Route path="exercicios" element={<Exercicios />} />
            <Route path="alimentos" element={<Alimentos />} />
            <Route path="cardio" element={<Cardio />} />
            <Route
              path="alunos/:alunoId/protocolos/:id"
              element={<ProtocoloBuilder />}
            />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function AlunoShell() {
  return (
    <div className="min-h-screen bg-surface">
      <Routes>
        {/* Telas standalone (sem nav inferior) */}
        <Route path="treino/:protocoloId/:treinoId" element={<TreinoExecucao />} />
        <Route path="dieta/:refeicaoId" element={<RefeicaoDetalhe />} />

        {/* Telas com nav inferior compartilhada via AlunoLayout */}
        <Route element={<AlunoLayout />}>
          <Route path="home"   element={<AlunoHome />} />
          <Route path="treino" element={<AlunoTreino />} />
          <Route path="dieta"  element={<AlunoDieta />} />
          <Route path="perfil" element={<AlunoPerfil />} />
        </Route>

        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <PrivateRoute role="admin">
                <AdminShell />
              </PrivateRoute>
            }
          />
          <Route
            path="/aluno/*"
            element={
              <PrivateRoute role="aluno">
                <AlunoShell />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </QueryClientProvider>
  );
}
