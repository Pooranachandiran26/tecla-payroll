import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '../../Layouts/GuestLayout';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';

export default function ForcePasswordChange() {
  const { data, setData, post, processing, errors } = useForm({
    password: '',
    password_confirmation: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post('/force-password-change');
  };

  return (
    <GuestLayout>
      <Head title="Change Password" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Update Your Password</h2>
        <p style={{ color: 'var(--text-muted)' }}>For security reasons, you must change your password before continuing.</p>
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
          {processing ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </GuestLayout>
  );
}
