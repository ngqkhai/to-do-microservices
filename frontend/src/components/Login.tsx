import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useAuth } from '../context/AuthContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: #F8FAFC;
`;

const FormContainer = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  width: 100%;
  max-width: 24rem;
`;

const Logo = styled.h1`
  color: #2563EB;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${props => props.hasError ? '#EF4444' : '#D1D5DB'};
  border-radius: 0.375rem;
  
  &:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const ErrorText = styled.p`
  color: #EF4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.625rem;
  background-color: #2563EB;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #1D4ED8;
  }
  
  &:disabled {
    background-color: #93C5FD;
    cursor: not-allowed;
  }
`;

const SwitchText = styled.p`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: #6B7280;
`;

const SwitchLink = styled.button`
  background: none;
  border: none;
  color: #2563EB;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: ''
  });
  
  const validateForm = () => {
    let valid = true;
    const errors = {
      email: '',
      password: ''
    };
    
    if (!email.trim()) {
      errors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
      valid = false;
    }
    
    if (!password) {
      errors.password = 'Password is required';
      valid = false;
    }
    
    setFormErrors(errors);
    return valid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        await login(email, password);
      } catch (err) {
        // Error is handled by the AuthContext
      }
    }
  };
  
  return (
    <Container>
      <FormContainer>
        <Logo>TaskMaster</Logo>
        <Title>Sign in to your account</Title>
        
        {error && (
          <ErrorText style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</ErrorText>
        )}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hasError={!!formErrors.email}
              placeholder="Enter your email"
            />
            {formErrors.email && <ErrorText>{formErrors.email}</ErrorText>}
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hasError={!!formErrors.password}
              placeholder="Enter your password"
            />
            {formErrors.password && <ErrorText>{formErrors.password}</ErrorText>}
          </FormGroup>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <SwitchText>
          Don't have an account?
          <SwitchLink type="button" onClick={onSwitchToRegister}>
            Sign up
          </SwitchLink>
        </SwitchText>
      </FormContainer>
    </Container>
  );
};

export default Login; 