import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '../../Layouts/GuestLayout';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';
import PasswordPolicyFeedback from '../../Components/ui/PasswordPolicyFeedback';

export default function AcceptInvitation({ email, role, token, passwordPolicyRules }) {
  const { data, setData, post, processing, errors } = useForm({
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('invitation.complete', token));
  };

  return (
    <GuestLayout>
      <Head title="Accept Invitation" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Welcome to Tecla Payroll</h2>
        <p style={{ color: 'var(--text-muted)' }}>You've been invited as a <strong>{role}</strong> ({email}). Please set your password to activate your account.</p>
      </div>

      <form onSubmit={submit}>
        <div>
          <Input 
            label="Create Password" 
            name="password" 
            type="password" 
            required 
            value={data.password}
            onChange={e => setData('password', e.target.value)}
            error={errors.password}
          />
          <PasswordPolicyFeedback password={data.password} rules={passwordPolicyRules} />
        </div>
        
        <Input 
          label="Confirm Password" 
          name="password_confirmation" 
          type="password" 
          required 
          value={data.password_confirmation}
          onChange={e => setData('password_confirmation', e.target.value)}
        />

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} disabled={processing}>
          {processing ? 'Activating...' : 'Activate Account'}
        </Button>
      </form>
    </GuestLayout>
  );
}
