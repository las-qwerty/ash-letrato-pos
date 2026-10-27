-- ASH LETRATO POS — initial seed. Mirrors packages/core/src/seed.ts.
-- Run after 0001_init.sql. PINs are NOT seeded here — the till sets pin_hash
-- on first verification (auth comes from Supabase Auth, not this table).

insert into branches (id, name, address) values
  ('br-greenhills', 'Main — Greenhills', 'Unit 20 Maranaw Plaza, Greenhills East, Mandaluyong'),
  ('br-caloocan',   'Caloocan',          'Caloocan'),
  ('br-galleria',   'Robinsons Galleria','Ortigas, Quezon City');

insert into staff_users (id, email, first_name, last_name, role, branch_id, can_authorize_voids) values
  ('u-admin',  'admin@ashletrato.com', 'Simone',  'Reyes',  'super_admin', 'br-greenhills', true),
  ('u-maria',  'maria@ashletrato.com', 'Maria',   'Santos', 'manager',     'br-greenhills', true),
  ('u-jonas',  'jonas@ashletrato.com', 'Jonas',   'Cruz',   'cashier',     'br-caloocan',   false),
  ('u-pia',    'pia@ashletrato.com',   'Pia',     'Lim',    'handler',     'br-galleria',   false);

insert into employee_profiles (user_id, position, status, hired_at, salary_type, rate) values
  ('u-admin', 'Owner',              'active', '2019-06-01', 'monthly', 60000),
  ('u-maria', 'Store Manager',      'active', '2021-03-15', 'monthly', 32000),
  ('u-jonas', 'Cashier',            'active', '2023-01-09', 'daily',      850),
  ('u-pia',   'Production Handler', 'active', '2024-05-02', 'daily',      780);

insert into store_settings (id, payload) values ('default', '{
  "storeName": "ASH LETRATO",
  "tin": "008-421-773-000",
  "addressLine1": "Unit 20 Maranaw Plaza, Greenhills East, Mandaluyong",
  "addressLine2": "BIR Accredited Printer · sales@ashletrato.com",
  "phone": "(02) 8725-7641",
  "receiptFooter": "Thank you! This serves as your sales invoice.",
  "vatRate": 12,
  "seniorPwdDiscountPct": 20,
  "loyaltyEarnRate": 0.1,
  "loyaltyRedeemValue": 0.01,
  "supervisorPin": "2468",
  "autoLockMinutes": 5,
  "notaryFee": 1,
  "productionEnabled": false,
  "receiptWidthMm": 80
}');
