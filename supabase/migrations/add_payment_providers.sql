-- Run this in your Supabase SQL editor to enable payment integrations
-- Dashboard → SQL Editor → New Query → paste and run

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS stripe_secret_key      text,
  ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
  ADD COLUMN IF NOT EXISTS paypal_client_id        text,
  ADD COLUMN IF NOT EXISTS paypal_client_secret    text,
  ADD COLUMN IF NOT EXISTS paystack_public_key     text,
  ADD COLUMN IF NOT EXISTS paystack_secret_key     text;

-- Also add payment tracking to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_provider  text,     -- 'stripe' | 'paypal' | 'paystack'
  ADD COLUMN IF NOT EXISTS payment_reference text;     -- external payment ID / reference
