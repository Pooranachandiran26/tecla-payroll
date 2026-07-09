import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import GuestLayout from '../../Layouts/GuestLayout';
import Button from '../../Components/ui/Button';

export default function VerifyOtp({ otpLength = 6, cooldownMinutes = 2 }) {
  const length = Number(otpLength);
  const [code, setCode] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);
  const [cooldown, setCooldown] = useState(0);

  const { data, setData, post, processing, errors } = useForm({
    code: '',
  });

  const { post: postResend, processing: resendProcessing } = useForm();

  const handleResend = (e) => {
    e.preventDefault();
    postResend('/login/resend-otp', {
      onSuccess: () => {
        setCooldown(cooldownMinutes * 60);
      }
    });
  };

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value) && value !== '') return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setData('code', newCode.join(''));

    if (value && index < length - 1) {
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
    if (data.code.length !== length) return;
    
    post('/login/verify-otp');
  };

  return (
    <GuestLayout>
      <Head title="Verify OTP" />
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2>Verify Login</h2>
        <p style={{ color: 'var(--text-muted)' }}>Enter the {length}-digit code sent to your email.</p>
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

        <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.75rem' }} disabled={processing || code.join('').length !== length}>
          {processing ? 'Verifying...' : 'Verify Code'}
        </Button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={handleResend}
            disabled={cooldown > 0 || resendProcessing}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: cooldown > 0 ? 'var(--text-muted)' : 'var(--primary-navy)',
              cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              textDecoration: cooldown > 0 ? 'none' : 'underline'
            }}
          >
            {cooldown > 0 ? `Resend code in ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` : 'Resend Code'}
          </button>
        </div>
      </form>
    </GuestLayout>
  );
}
