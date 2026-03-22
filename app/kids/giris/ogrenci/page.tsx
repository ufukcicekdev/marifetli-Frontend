import { KidsRoleLoginForm } from '@/src/components/kids/kids-role-login-form';

export default function KidsStudentLoginPage() {
  return (
    <div className="space-y-8">
      <KidsRoleLoginForm
        title="Öğrenci girişi"
        subtitle="Kayıt yalnızca öğretmen davetiyle yapılır. Davet e-postasındaki linkle ad-soyad ve şifre belirlersin."
        allowedRoles={['student']}
        redirectTo="/ogrenci/panel"
      />
    </div>
  );
}
