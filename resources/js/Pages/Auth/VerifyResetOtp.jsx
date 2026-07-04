import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import GuestLayout from '../../Layouts/GuestLayout';
import Button from '../../Components/ui/Button';

export default function VerifyResetOtp({ email }) {
  const otpLength = 6;
  const [code, setCode] = useState(Array(otpLength).fill(''));
  const inputRefs = useRef([]);

  const { post, processing, errors } = useForm({
    code: '',
  });

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < otpLength - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== otpLength) return;
    
    post('/reset-password/verify-otp', {
      data: { code: fullCode }
    });
  };

  return (
    <GuestLayout>
      <Head title="Verify Reset Code" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Enter Reset Code</h2>
        <p style={{ color: 'var(--text-muted)' }}>Enter the code sent to {email}.</p>
      </div>

      <form onSubmit={submit}>
        {errors.code && (
          <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            {errors.code}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                width: '3rem',
                height: '3.5rem',
                textAlign: 'center',
                fontSize: '1.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            />
          ))}
        </div>

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem' }} disabled={processing || code.join('').length !== otpLength}>
          {processing ? 'Verifying...' : 'Verify Code'}
        </Button>
      </form>
    </GuestLayout>
  );
}
