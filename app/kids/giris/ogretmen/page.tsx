import { KidsRoleLoginForm } from '@/src/components/kids/kids-role-login-form';

export default function KidsTeacherLoginPage() {
  return (
    <KidsRoleLoginForm
      title="Öğretmen girişi"
      subtitle="Hesabın Django yönetim panelinden veya admin tarafından açılmış olmalıdır."
      allowedRoles={['teacher', 'admin']}
      redirectTo="/ogretmen/panel"
    />
  );
}
