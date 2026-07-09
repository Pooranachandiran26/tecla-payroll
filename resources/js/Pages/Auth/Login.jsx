import { Head, Link } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import GuestLayout from '../../Layouts/GuestLayout';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';
import Checkbox from '../../Components/ui/Checkbox';

export default function Login({ rememberMeEnabled = true }) {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
    website_url: '', // Honeypot field
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setData(e.target.name, value);
  };

  const submit = (e) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <GuestLayout>
      <Head title="Login" />
      
      <form onSubmit={submit}>
        {errors.email && (
          <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {errors.email}
          </div>
        )}
        
        {/* Honeypot field (hidden from users) */}
        <div style={{ display: 'none' }}>
          <label htmlFor="website_url">Leave this field blank</label>
          <input 
            type="text" 
            id="website_url" 
            name="website_url" 
            value={data.website_url}
            onChange={handleChange}
            tabIndex="-1" 
            autoComplete="off" 
          />
        </div>

        <Input 
          label="Work Email" 
          name="email" 
          type="email" 
          placeholder="name@company.com" 
          required 
          value={data.email}
          onChange={handleChange}
        />
        
        <Input 
          label="Password" 
          name="password" 
          type="password" 
          placeholder="••••••••" 
          required 
          value={data.password}
          onChange={handleChange}
        />

        <div className="form-row" style={{ alignItems: 'center', marginBottom: '1.5rem', display: 'flex', justifyContent: rememberMeEnabled ? 'space-between' : 'flex-end' }}>
          {rememberMeEnabled && (
            <Checkbox 
              label="Remember me" 
              name="remember" 
              checked={data.remember}
              onChange={handleChange}
            />
          )}
          <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary-navy)' }}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem' }} disabled={processing}>
          {processing ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
    </GuestLayout>
  );
}
