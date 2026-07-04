import { Head, useForm, Link } from '@inertiajs/react';
import GuestLayout from '../../Layouts/GuestLayout';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';

export default function ForgotPassword() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post('/forgot-password');
  };

  return (
    <GuestLayout>
      <Head title="Forgot Password" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Reset Password</h2>
        <p style={{ color: 'var(--text-muted)' }}>Enter your email address to receive a password reset code.</p>
      </div>

      <form onSubmit={submit}>
        <Input 
          label="Email Address" 
          name="email" 
          type="email" 
          required 
          value={data.email}
          onChange={e => setData('email', e.target.value)}
          error={errors.email}
        />

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }} disabled={processing}>
          {processing ? 'Sending...' : 'Send Reset Code'}
        </Button>
        
        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: '0.85rem', color: 'var(--primary-navy)' }}>
            Back to Login
          </Link>
        </div>
      </form>
    </GuestLayout>
  );
}
