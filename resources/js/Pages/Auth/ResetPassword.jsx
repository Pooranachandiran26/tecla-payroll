import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '../../Layouts/GuestLayout';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';

export default function ResetPassword() {
  const { data, setData, post, processing, errors } = useForm({
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post('/reset-password/new');
  };

  return (
    <GuestLayout>
      <Head title="Reset Password" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Create New Password</h2>
        <p style={{ color: 'var(--text-muted)' }}>Your identity has been verified. Please create a new password.</p>
      </div>

      <form onSubmit={submit}>
        <Input 
          label="New Password" 
          name="password" 
          type="password" 
          required 
          value={data.password}
          onChange={e => setData('password', e.target.value)}
          error={errors.password}
        />
        
        <Input 
          label="Confirm New Password" 
          name="password_confirmation" 
          type="password" 
          required 
          value={data.password_confirmation}
          onChange={e => setData('password_confirmation', e.target.value)}
        />

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} disabled={processing}>
          {processing ? 'Saving...' : 'Save New Password'}
        </Button>
      </form>
    </GuestLayout>
  );
}
