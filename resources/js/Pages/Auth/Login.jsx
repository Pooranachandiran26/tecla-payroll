import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import GuestLayout from '../../Layouts/GuestLayout';
import Card from '../../Components/ui/Card';
import Input from '../../Components/ui/Input';
import Button from '../../Components/ui/Button';
import Select from '../../Components/ui/Select';
import Checkbox from '../../Components/ui/Checkbox';

export default function Login() {
  const [data, setData] = useState({
    email: 'rajesh@tecla.in',
    password: 'password123',
    role: 'admin',
    remember: true
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    
    // In a real app this would post to an authentication endpoint.
    // For this prototype, we simulate login routing based on role selection:
    if (data.role === 'admin' || data.role === 'executive') {
      router.visit('/dashboard');
    } else if (data.role === 'client') {
      router.visit('/client/dashboard');
    } else if (data.role === 'candidate') {
      router.visit('/employee/dashboard');
    }
  };

  return (
    <GuestLayout>
      <Head title="Login" />
      
      <form onSubmit={submit}>
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

        <Select
          label="Choose Demo Role"
          name="role"
          value={data.role}
          onChange={handleChange}
          options={[
            { value: 'admin', label: 'Agency Admin (Full View & Margin Visibility)' },
            { value: 'executive', label: 'Manager (No Margin/Profit View)' },
            { value: 'client', label: 'Client Portal (Mahindra Corp View)' },
            { value: 'candidate', label: 'Employee Portal (Aarav Sharma View)' }
          ]}
        />

        <div className="form-row" style={{ alignItems: 'center', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <Checkbox 
            label="Remember me" 
            name="remember" 
            checked={data.remember}
            onChange={handleChange}
          />
          <a href="#" style={{ fontSize: '0.8rem', color: 'var(--primary-navy)' }}>Forgot password?</a>
        </div>

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem' }}>
          Sign In
        </Button>
      </form>
      
      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Demo Account: <strong>admin</strong> | Password: <strong>password123</strong>
      </div>
    </GuestLayout>
  );
}
