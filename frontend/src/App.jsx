import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import { ToastProvider } from './components/ui/Toast';

import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Alunos from './pages/admin/Alunos';
import AlunoDetalhe from './pages/admin/AlunoDetalhe';
import Exercicios from './pages/admin/Exercicios';
import Alimentos from './pages/admin/Alimentos';
import Cardio from './pages/admin/Cardio';
import ProtocoloBuilder from './pages/admin/ProtocoloBuilder';

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
      </main>
    </div>
  );
}

function AlunoShell() {
  return (
    <div className="min-h-screen bg-surface">
      <Routes>
        <Route path="home" element={<AlunoHome />} />
        <Route path="treino" element={<AlunoTreino />} />
        <Route path="treino/:protocoloId/:treinoId" element={<TreinoExecucao />} />
        <Route path="dieta" element={<AlunoDieta />} />
        <Route path="dieta/:refeicaoId" element={<RefeicaoDetalhe />} />
        <Route path="perfil" element={<AlunoPerfil />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
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
  );
}
