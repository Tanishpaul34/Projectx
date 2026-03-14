-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  business_name text,
  business_address text,
  google_place_id text,
  brand_voice text default 'Professional',
  approval_mode text default 'Manual Approval'
);

-- Set up Row Level Security (RLS)
alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for subscriptions
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  plan text not null, -- 'Starter' or 'Pro'
  status text not null, -- 'active', 'inactive', 'pending'
  nowpayments_payment_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table subscriptions
  enable row level security;

create policy "Users can view their own subscriptions." on subscriptions
  for select using (auth.uid() = user_id);

create policy "Service role can insert subscriptions." on subscriptions
  for insert with check (true);

create policy "Service role can update subscriptions." on subscriptions
  for update using (true);

-- Create a table for reviews
create table reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  review_text text not null,
  reviewer_name text,
  rating integer,
  sentiment text, -- 'Positive', 'Negative', 'Neutral'
  sentiment_score numeric,
  key_topics text[],
  urgency text, -- 'High', 'Medium', 'Low'
  ai_suggested_response text,
  status text default 'Pending', -- 'Pending', 'Posted'
  google_review_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table reviews
  enable row level security;

create policy "Users can view their own reviews." on reviews
  for select using (auth.uid() = user_id);

create policy "Service role can insert reviews." on reviews
  for insert with check (true);

create policy "Service role can update reviews." on reviews
  for update using (true);
