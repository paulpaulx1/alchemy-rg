// components/ContactForm.jsx
import React from 'react';
import { useForm, ValidationError } from '@formspree/react';
import styles from './ContactForm.module.css';

export default function ContactForm() {
  const [state, handleSubmit] = useForm("xwplvoel");
  
  if (state.succeeded) {
    return <p className={styles.successMessage}>Thank you for your message. We'll be in touch soon.</p>;
  }
  
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          Name
        </label>
        <input
          id="name"
          type="text" 
          name="name"
          className={styles.input}
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email" 
          name="email"
          className={styles.input}
          required
        />
        <ValidationError prefix="Email" field="email" errors={state.errors} className={styles.errorMessage} />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="website" className={styles.label}>
          Website (optional)
        </label>
        <input
          id="website"
          type="url" 
          name="website"
          className={styles.input}
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="message" className={styles.label}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows="5"
          className={styles.textarea}
          required
        />
        <ValidationError prefix="Message" field="message" errors={state.errors} className={styles.errorMessage} />
      </div>
      
      <button 
        type="submit" 
        disabled={state.submitting}
        className={styles.submitButton}
      >
        {state.submitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}