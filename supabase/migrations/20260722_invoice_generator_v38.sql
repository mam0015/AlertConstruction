-- Alert Construction Invoice Generator V38
-- Team-isolated invoices, server-validated totals, private PDF storage and exact role enforcement.

create extension if not exists pgcrypto;

-- V38 keeps the current Operations Hub role set available on fresh installs too.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','estimator','manager','site_supervisor','worker','builder','pending','rejected'));

create table if not exists public.ac_invoice_settings (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  company_name text not null default 'Alert Construction Pty Ltd',
  abn text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  bank_account_name text not null default '',
  bank_bsb text not null default '',
  bank_account_number text not null default '',
  payment_terms text not null default '',
  default_profit_type text not null default 'percent' check (default_profit_type in ('percent','fixed')),
  default_profit_value numeric(12,2) not null default 20 check (default_profit_value >= 0),
  gst_rate numeric(6,2) not null default 10 check (gst_rate between 0 and 100),
  logo_path text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ac_invoice_counters (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  invoice_year integer not null check (invoice_year between 2000 and 2200),
  next_sequence bigint not null default 1 check (next_sequence > 0),
  primary key (organisation_id, invoice_year)
);

create table if not exists public.ac_invoices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  invoice_number text not null,
  invoice_year integer not null,
  invoice_sequence bigint not null,
  project_id text,
  customer_id text,
  quote_id text,
  project_name text not null default '',
  project_address text not null default '',
  customer_name text not null default '',
  customer_company text not null default '',
  customer_address text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_abn text not null default '',
  reference_no text not null default '',
  issue_date date not null default current_date,
  due_date date not null default current_date,
  status text not null default 'Draft' check (status in ('Draft','Issued','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  notes text not null default '',
  private_notes text not null default '',
  payment_terms text not null default '',
  default_profit_type text not null default 'percent' check (default_profit_type in ('percent','fixed')),
  default_profit_value numeric(12,2) not null default 20 check (default_profit_value >= 0),
  gst_enabled boolean not null default true,
  gst_rate numeric(6,2) not null default 10 check (gst_rate between 0 and 100),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  profit_amount numeric(14,2) not null default 0 check (profit_amount >= 0),
  gst_amount numeric(14,2) not null default 0 check (gst_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) not null default 0 check (balance_due >= 0),
  pdf_path text not null default '',
  pdf_filename text not null default '',
  pdf_size_bytes bigint,
  pdf_generated_at timestamptz,
  pdf_generated_by uuid references auth.users(id) on delete set null,
  company_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, invoice_number),
  unique (organisation_id, invoice_year, invoice_sequence),
  check (due_date >= issue_date)
);

create table if not exists public.ac_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.ac_invoices(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text not null default '',
  quantity numeric(14,3) not null default 1 check (quantity >= 0),
  unit text not null default 'each',
  base_cost numeric(14,2) not null default 0 check (base_cost >= 0),
  profit_type text not null default 'percent' check (profit_type in ('percent','fixed')),
  profit_value numeric(14,2) not null default 0 check (profit_value >= 0),
  profit_unit numeric(14,2) not null default 0 check (profit_unit >= 0),
  selling_unit_price numeric(14,2) not null default 0 check (selling_unit_price >= 0),
  line_profit numeric(14,2) not null default 0 check (line_profit >= 0),
  line_subtotal numeric(14,2) not null default 0 check (line_subtotal >= 0),
  gst_applicable boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ac_invoices_org_date_idx on public.ac_invoices(organisation_id, issue_date desc);
create index if not exists ac_invoices_org_status_idx on public.ac_invoices(organisation_id, status, due_date);
create index if not exists ac_invoices_org_project_idx on public.ac_invoices(organisation_id, project_id);
create index if not exists ac_invoice_items_invoice_idx on public.ac_invoice_items(invoice_id, position);

drop trigger if exists ac_invoice_settings_updated_at on public.ac_invoice_settings;
create trigger ac_invoice_settings_updated_at before update on public.ac_invoice_settings
for each row execute function public.set_updated_at();
drop trigger if exists ac_invoices_updated_at on public.ac_invoices;
create trigger ac_invoices_updated_at before update on public.ac_invoices
for each row execute function public.set_updated_at();

create or replace function public.ac_invoice_require_role(p_roles text[])
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
declare selected_role text;
begin
  select p.role into selected_role from public.profiles p where p.id = auth.uid() and p.active = true;
  if selected_role is null or not (selected_role = any(p_roles)) then
    raise exception 'Your role does not have permission for this invoice action';
  end if;
end;
$$;

create or replace function public.ac_invoice_calculate(p_invoice jsonb, p_items jsonb)
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare
  source_item jsonb; normalised jsonb := '[]'::jsonb;
  qty numeric; base_cost_value numeric; profit_type_value text; profit_value_number numeric;
  default_profit_type_value text := case when p_invoice->>'default_profit_type' = 'fixed' then 'fixed' else 'percent' end;
  default_profit_value_number numeric := greatest(coalesce(nullif(p_invoice->>'default_profit_value','')::numeric,0),0);
  profit_unit_value numeric; selling_unit_value numeric; line_profit_value numeric; line_subtotal_value numeric;
  subtotal_value numeric := 0; profit_total_value numeric := 0; taxable_value numeric := 0;
  discount_value numeric; taxable_discount_value numeric := 0; gst_rate_value numeric; gst_value numeric := 0;
  total_value numeric; paid_value numeric; gst_enabled_value boolean;
begin
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'At least one invoice item is required'; end if;
  for source_item in select value from jsonb_array_elements(p_items) loop
    if nullif(trim(source_item->>'title'),'') is null then raise exception 'Every invoice item requires a title'; end if;
    qty := greatest(coalesce(nullif(source_item->>'quantity','')::numeric,0),0);
    base_cost_value := round(greatest(coalesce(nullif(source_item->>'base_cost','')::numeric,0),0),2);
    profit_type_value := case when source_item->>'profit_type' in ('percent','fixed') then source_item->>'profit_type' else default_profit_type_value end;
    profit_value_number := greatest(coalesce(nullif(source_item->>'profit_value','')::numeric,default_profit_value_number),0);
    profit_unit_value := round(case when profit_type_value='fixed' then profit_value_number else base_cost_value*profit_value_number/100 end,2);
    selling_unit_value := round(base_cost_value+profit_unit_value,2);
    line_profit_value := round(qty*profit_unit_value,2); line_subtotal_value := round(qty*selling_unit_value,2);
    subtotal_value := subtotal_value+line_subtotal_value; profit_total_value := profit_total_value+line_profit_value;
    if coalesce((source_item->>'gst_applicable')::boolean,true) then taxable_value := taxable_value+line_subtotal_value; end if;
    normalised := normalised || jsonb_build_array(jsonb_build_object(
      'id',nullif(source_item->>'id',''),'title',trim(source_item->>'title'),'description',coalesce(source_item->>'description',''),
      'quantity',qty,'unit',coalesce(nullif(trim(source_item->>'unit'),''),'each'),'base_cost',base_cost_value,
      'profit_type',profit_type_value,'profit_value',profit_value_number,'profit_unit',profit_unit_value,
      'selling_unit_price',selling_unit_value,'line_profit',line_profit_value,'line_subtotal',line_subtotal_value,
      'gst_applicable',coalesce((source_item->>'gst_applicable')::boolean,true)
    ));
  end loop;
  subtotal_value := round(subtotal_value,2); profit_total_value := round(profit_total_value,2);
  discount_value := least(round(greatest(coalesce(nullif(p_invoice->>'discount_amount','')::numeric,0),0),2),subtotal_value);
  gst_enabled_value := coalesce((p_invoice->>'gst_enabled')::boolean,true);
  gst_rate_value := case when gst_enabled_value then least(greatest(coalesce(nullif(p_invoice->>'gst_rate','')::numeric,10),0),100) else 0 end;
  if subtotal_value>0 then taxable_discount_value := round(discount_value*(taxable_value/subtotal_value),2); end if;
  gst_value := round(greatest(taxable_value-taxable_discount_value,0)*gst_rate_value/100,2);
  total_value := round(subtotal_value-discount_value+gst_value,2);
  paid_value := least(round(greatest(coalesce(nullif(p_invoice->>'amount_paid','')::numeric,0),0),2),total_value);
  return jsonb_build_object('items',normalised,'subtotal',subtotal_value,'discount_amount',discount_value,'profit_amount',profit_total_value,'gst_amount',gst_value,'total_amount',total_value,'amount_paid',paid_value,'balance_due',round(total_value-paid_value,2),'gst_rate',gst_rate_value);
end;
$$;

create or replace function public.ac_invoice_json(p_invoice_id uuid, p_include_internal boolean)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare document jsonb; item_rows jsonb;
begin
  select to_jsonb(i) into document from public.ac_invoices i where i.id=p_invoice_id;
  if document is null then return null; end if;
  select coalesce(jsonb_agg(case when p_include_internal then to_jsonb(ii) else to_jsonb(ii)-'base_cost'-'profit_type'-'profit_value'-'profit_unit'-'line_profit' end order by ii.position),'[]'::jsonb)
    into item_rows from public.ac_invoice_items ii where ii.invoice_id=p_invoice_id;
  if not p_include_internal then document := document-'profit_amount'-'private_notes'-'created_by'-'updated_by'-'pdf_generated_by'; end if;
  return document || jsonb_build_object('ac_invoice_items',item_rows);
end;
$$;

create or replace function public.list_ac_invoices()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare org_id uuid; selected_role text; result jsonb;
begin
  perform public.ac_invoice_require_role(array['owner','estimator','manager']);
  select p.organisation_id,p.role into org_id,selected_role from public.profiles p where p.id=auth.uid() and p.active=true;
  select coalesce(jsonb_agg(public.ac_invoice_json(i.id,selected_role in ('owner','estimator')) order by i.created_at desc),'[]'::jsonb) into result from public.ac_invoices i where i.organisation_id=org_id;
  return result;
end;
$$;

create or replace function public.get_ac_invoice_settings()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare org_id uuid; result jsonb;
begin
  perform public.ac_invoice_require_role(array['owner','estimator','manager']);org_id:=public.current_organisation_id();
  select to_jsonb(s)-'updated_by' into result from public.ac_invoice_settings s where s.organisation_id=org_id;
  return coalesce(result,jsonb_build_object('company_name','Alert Construction Pty Ltd','abn','72 646 119 717','address','Suite 40 / 541 Blackburn Rd\nMount Waverley VIC 3149','phone','(03) 8820 6567','email','info@alertconstruction.com.au','website','www.alertconstruction.com.au','bank_account_name','Alert Construction Pty Ltd','bank_bsb','063-254','bank_account_number','1089 6626','payment_terms','Payment is due by the due date shown on this invoice.','default_profit_type','percent','default_profit_value',20,'gst_rate',10,'logo_path',''));
end;
$$;

create or replace function public.upsert_ac_invoice_settings(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare org_id uuid; logo_value text; result jsonb;
begin
  perform public.ac_invoice_require_role(array['owner']);org_id:=public.current_organisation_id();logo_value:=coalesce(p_settings->>'logo_path','');
  if logo_value<>'' and split_part(logo_value,'/',1)<>org_id::text then raise exception 'Invalid company logo path'; end if;
  insert into public.ac_invoice_settings(organisation_id,company_name,abn,address,phone,email,website,bank_account_name,bank_bsb,bank_account_number,payment_terms,default_profit_type,default_profit_value,gst_rate,logo_path,updated_by)
  values(org_id,coalesce(nullif(trim(p_settings->>'company_name'),''),'Alert Construction Pty Ltd'),coalesce(p_settings->>'abn',''),coalesce(p_settings->>'address',''),coalesce(p_settings->>'phone',''),coalesce(p_settings->>'email',''),coalesce(p_settings->>'website',''),coalesce(p_settings->>'bank_account_name',''),coalesce(p_settings->>'bank_bsb',''),coalesce(p_settings->>'bank_account_number',''),coalesce(p_settings->>'payment_terms',''),case when p_settings->>'default_profit_type'='fixed' then 'fixed' else 'percent' end,greatest(coalesce(nullif(p_settings->>'default_profit_value','')::numeric,20),0),least(greatest(coalesce(nullif(p_settings->>'gst_rate','')::numeric,10),0),100),logo_value,auth.uid())
  on conflict(organisation_id) do update set company_name=excluded.company_name,abn=excluded.abn,address=excluded.address,phone=excluded.phone,email=excluded.email,website=excluded.website,bank_account_name=excluded.bank_account_name,bank_bsb=excluded.bank_bsb,bank_account_number=excluded.bank_account_number,payment_terms=excluded.payment_terms,default_profit_type=excluded.default_profit_type,default_profit_value=excluded.default_profit_value,gst_rate=excluded.gst_rate,logo_path=excluded.logo_path,updated_by=auth.uid();
  insert into public.ac_audit_log(organisation_id,action,module,details,actor_id) values(org_id,'invoice_settings_updated','invoice',jsonb_build_object('updated_at',now()),auth.uid());
  select to_jsonb(s)-'updated_by' into result from public.ac_invoice_settings s where s.organisation_id=org_id;return result;
end;
$$;

create or replace function public.create_ac_invoice_draft(p_invoice jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare org_id uuid; invoice_id uuid:=gen_random_uuid(); issue_value date; due_value date; year_value integer; sequence_value bigint; number_value text; calculated jsonb; item_value jsonb; position_value integer:=0;
begin
  perform public.ac_invoice_require_role(array['owner','estimator']);org_id:=public.current_organisation_id();
  if nullif(trim(coalesce(p_invoice->>'customer_name','')),'') is null and nullif(trim(coalesce(p_invoice->>'customer_company','')),'') is null then raise exception 'Customer name or company is required';end if;
  issue_value:=coalesce(nullif(p_invoice->>'issue_date','')::date,current_date);due_value:=coalesce(nullif(p_invoice->>'due_date','')::date,issue_value);if due_value<issue_value then raise exception 'Due date cannot be before issue date';end if;
  year_value:=extract(year from issue_value)::integer;
  insert into public.ac_invoice_counters(organisation_id,invoice_year,next_sequence) values(org_id,year_value,2)
  on conflict(organisation_id,invoice_year) do update set next_sequence=public.ac_invoice_counters.next_sequence+1 returning next_sequence-1 into sequence_value;
  number_value:='INV-'||year_value||'-'||lpad(sequence_value::text,4,'0');
  calculated:=public.ac_invoice_calculate((p_invoice||jsonb_build_object('amount_paid',0)),p_items);
  insert into public.ac_invoices(id,organisation_id,invoice_number,invoice_year,invoice_sequence,project_id,customer_id,quote_id,project_name,project_address,customer_name,customer_company,customer_address,customer_email,customer_phone,customer_abn,reference_no,issue_date,due_date,status,notes,private_notes,payment_terms,default_profit_type,default_profit_value,gst_enabled,gst_rate,subtotal,discount_amount,profit_amount,gst_amount,total_amount,amount_paid,balance_due,created_by,updated_by)
  values(invoice_id,org_id,number_value,year_value,sequence_value,nullif(p_invoice->>'project_id',''),nullif(p_invoice->>'customer_id',''),nullif(p_invoice->>'quote_id',''),coalesce(p_invoice->>'project_name',''),coalesce(p_invoice->>'project_address',''),coalesce(p_invoice->>'customer_name',''),coalesce(p_invoice->>'customer_company',''),coalesce(p_invoice->>'customer_address',''),coalesce(p_invoice->>'customer_email',''),coalesce(p_invoice->>'customer_phone',''),coalesce(p_invoice->>'customer_abn',''),coalesce(p_invoice->>'reference_no',''),issue_value,due_value,'Draft',coalesce(p_invoice->>'notes',''),coalesce(p_invoice->>'private_notes',''),coalesce(p_invoice->>'payment_terms',''),case when p_invoice->>'default_profit_type'='fixed' then 'fixed' else 'percent' end,greatest(coalesce(nullif(p_invoice->>'default_profit_value','')::numeric,0),0),coalesce((p_invoice->>'gst_enabled')::boolean,true),(calculated->>'gst_rate')::numeric,(calculated->>'subtotal')::numeric,(calculated->>'discount_amount')::numeric,(calculated->>'profit_amount')::numeric,(calculated->>'gst_amount')::numeric,(calculated->>'total_amount')::numeric,0,(calculated->>'total_amount')::numeric,auth.uid(),auth.uid());
  for item_value in select value from jsonb_array_elements(calculated->'items') loop position_value:=position_value+1;insert into public.ac_invoice_items(invoice_id,organisation_id,position,title,description,quantity,unit,base_cost,profit_type,profit_value,profit_unit,selling_unit_price,line_profit,line_subtotal,gst_applicable) values(invoice_id,org_id,position_value,item_value->>'title',item_value->>'description',(item_value->>'quantity')::numeric,item_value->>'unit',(item_value->>'base_cost')::numeric,item_value->>'profit_type',(item_value->>'profit_value')::numeric,(item_value->>'profit_unit')::numeric,(item_value->>'selling_unit_price')::numeric,(item_value->>'line_profit')::numeric,(item_value->>'line_subtotal')::numeric,(item_value->>'gst_applicable')::boolean);end loop;
  insert into public.ac_audit_log(organisation_id,project_id,record_id,action,module,details,actor_id) values(org_id,nullif(p_invoice->>'project_id',''),invoice_id::text,'invoice_created','invoice',jsonb_build_object('invoice_number',number_value,'status','Draft','total',(calculated->>'total_amount')::numeric),auth.uid());
  return public.ac_invoice_json(invoice_id,true);
end;
$$;

create or replace function public.update_ac_invoice(p_invoice_id uuid, p_invoice jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare org_id uuid; selected_role text; existing public.ac_invoices%rowtype; calculated jsonb; effective_payload jsonb; requested_status text; effective_status text; item_value jsonb; position_value integer:=0;
begin
  perform public.ac_invoice_require_role(array['owner','estimator']);select p.organisation_id,p.role into org_id,selected_role from public.profiles p where p.id=auth.uid() and p.active=true;
  if nullif(trim(coalesce(p_invoice->>'customer_name','')),'') is null and nullif(trim(coalesce(p_invoice->>'customer_company','')),'') is null then raise exception 'Customer name or company is required';end if;
  select * into existing from public.ac_invoices i where i.id=p_invoice_id and i.organisation_id=org_id for update;if existing.id is null then raise exception 'Invoice not found';end if;
  if coalesce(nullif(p_invoice->>'due_date','')::date,existing.due_date)<coalesce(nullif(p_invoice->>'issue_date','')::date,existing.issue_date) then raise exception 'Due date cannot be before issue date';end if;
  requested_status:=case when selected_role='owner' and p_invoice->>'status' in ('Draft','Issued','Sent','Partially Paid','Paid','Overdue','Cancelled') then p_invoice->>'status' else existing.status end;
  effective_payload:=p_invoice||jsonb_build_object('amount_paid',case when selected_role='owner' then greatest(coalesce(nullif(p_invoice->>'amount_paid','')::numeric,existing.amount_paid),0) else existing.amount_paid end);
  calculated:=public.ac_invoice_calculate(effective_payload,p_items);
  effective_status:=case when requested_status='Cancelled' then 'Cancelled' when (calculated->>'total_amount')::numeric>0 and (calculated->>'amount_paid')::numeric>=(calculated->>'total_amount')::numeric then 'Paid' when (calculated->>'amount_paid')::numeric>0 then 'Partially Paid' else requested_status end;
  update public.ac_invoices set project_id=nullif(p_invoice->>'project_id',''),customer_id=nullif(p_invoice->>'customer_id',''),quote_id=nullif(p_invoice->>'quote_id',''),project_name=coalesce(p_invoice->>'project_name',''),project_address=coalesce(p_invoice->>'project_address',''),customer_name=coalesce(p_invoice->>'customer_name',''),customer_company=coalesce(p_invoice->>'customer_company',''),customer_address=coalesce(p_invoice->>'customer_address',''),customer_email=coalesce(p_invoice->>'customer_email',''),customer_phone=coalesce(p_invoice->>'customer_phone',''),customer_abn=coalesce(p_invoice->>'customer_abn',''),reference_no=coalesce(p_invoice->>'reference_no',''),issue_date=coalesce(nullif(p_invoice->>'issue_date','')::date,existing.issue_date),due_date=coalesce(nullif(p_invoice->>'due_date','')::date,existing.due_date),status=effective_status,notes=coalesce(p_invoice->>'notes',''),private_notes=coalesce(p_invoice->>'private_notes',''),payment_terms=coalesce(p_invoice->>'payment_terms',''),default_profit_type=case when p_invoice->>'default_profit_type'='fixed' then 'fixed' else 'percent' end,default_profit_value=greatest(coalesce(nullif(p_invoice->>'default_profit_value','')::numeric,0),0),gst_enabled=coalesce((p_invoice->>'gst_enabled')::boolean,true),gst_rate=(calculated->>'gst_rate')::numeric,subtotal=(calculated->>'subtotal')::numeric,discount_amount=(calculated->>'discount_amount')::numeric,profit_amount=(calculated->>'profit_amount')::numeric,gst_amount=(calculated->>'gst_amount')::numeric,total_amount=(calculated->>'total_amount')::numeric,amount_paid=(calculated->>'amount_paid')::numeric,balance_due=(calculated->>'balance_due')::numeric,updated_by=auth.uid() where id=p_invoice_id;
  delete from public.ac_invoice_items where invoice_id=p_invoice_id;
  for item_value in select value from jsonb_array_elements(calculated->'items') loop position_value:=position_value+1;insert into public.ac_invoice_items(invoice_id,organisation_id,position,title,description,quantity,unit,base_cost,profit_type,profit_value,profit_unit,selling_unit_price,line_profit,line_subtotal,gst_applicable) values(p_invoice_id,org_id,position_value,item_value->>'title',item_value->>'description',(item_value->>'quantity')::numeric,item_value->>'unit',(item_value->>'base_cost')::numeric,item_value->>'profit_type',(item_value->>'profit_value')::numeric,(item_value->>'profit_unit')::numeric,(item_value->>'selling_unit_price')::numeric,(item_value->>'line_profit')::numeric,(item_value->>'line_subtotal')::numeric,(item_value->>'gst_applicable')::boolean);end loop;
  insert into public.ac_audit_log(organisation_id,project_id,record_id,action,module,details,actor_id) values(org_id,nullif(p_invoice->>'project_id',''),p_invoice_id::text,'invoice_updated','invoice',jsonb_build_object('invoice_number',existing.invoice_number,'old_status',existing.status,'new_status',effective_status,'old_total',existing.total_amount,'new_total',(calculated->>'total_amount')::numeric),auth.uid());
  return public.ac_invoice_json(p_invoice_id,true);
end;
$$;

create or replace function public.delete_ac_invoice(p_invoice_id uuid)
returns boolean language plpgsql security definer set search_path = public, storage, pg_temp as $$
declare org_id uuid; existing public.ac_invoices%rowtype;
begin
  perform public.ac_invoice_require_role(array['owner']);org_id:=public.current_organisation_id();select * into existing from public.ac_invoices where id=p_invoice_id and organisation_id=org_id for update;if existing.id is null then raise exception 'Invoice not found';end if;
  insert into public.ac_audit_log(organisation_id,project_id,record_id,action,module,details,actor_id) values(org_id,existing.project_id,p_invoice_id::text,'invoice_deleted','invoice',jsonb_build_object('invoice_number',existing.invoice_number,'status',existing.status,'total',existing.total_amount),auth.uid());
  delete from public.ac_invoices where id=p_invoice_id;
  begin delete from storage.objects where bucket_id='invoice-pdfs' and name like org_id::text||'/'||p_invoice_id::text||'/%';exception when others then null;end;
  return true;
end;
$$;

create or replace function public.record_ac_invoice_pdf(p_invoice_id uuid, p_pdf_path text, p_filename text, p_size_bytes bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare org_id uuid; existing public.ac_invoices%rowtype; snapshot jsonb;
begin
  perform public.ac_invoice_require_role(array['owner','estimator']);org_id:=public.current_organisation_id();select * into existing from public.ac_invoices where id=p_invoice_id and organisation_id=org_id for update;if existing.id is null then raise exception 'Invoice not found';end if;
  if split_part(coalesce(p_pdf_path,''),'/',1)<>org_id::text or split_part(coalesce(p_pdf_path,''),'/',2)<>p_invoice_id::text then raise exception 'Invalid invoice PDF path';end if;if p_filename !~* '\.pdf$' then raise exception 'Invoice filename must end in .pdf';end if;
  select coalesce(to_jsonb(s)-'updated_by'-'created_at'-'updated_at','{}'::jsonb) into snapshot from public.ac_invoice_settings s where s.organisation_id=org_id;snapshot:=coalesce(snapshot,'{}'::jsonb);
  update public.ac_invoices set pdf_path=p_pdf_path,pdf_filename=left(p_filename,180),pdf_size_bytes=greatest(coalesce(p_size_bytes,0),0),pdf_generated_at=now(),pdf_generated_by=auth.uid(),company_snapshot=snapshot,updated_by=auth.uid() where id=p_invoice_id;
  insert into public.ac_audit_log(organisation_id,project_id,record_id,action,module,details,actor_id) values(org_id,existing.project_id,p_invoice_id::text,'invoice_pdf_generated','invoice',jsonb_build_object('invoice_number',existing.invoice_number,'filename',left(p_filename,180),'size_bytes',greatest(coalesce(p_size_bytes,0),0)),auth.uid());
  return public.ac_invoice_json(p_invoice_id,true);
end;
$$;

alter table public.ac_invoice_settings enable row level security;
alter table public.ac_invoice_counters enable row level security;
alter table public.ac_invoices enable row level security;
alter table public.ac_invoice_items enable row level security;

drop policy if exists invoice_settings_read_roles on public.ac_invoice_settings;
create policy invoice_settings_read_roles on public.ac_invoice_settings for select to authenticated using(organisation_id=public.current_organisation_id() and public.current_ac_role() in ('owner','estimator','manager'));
drop policy if exists invoices_read_roles on public.ac_invoices;
create policy invoices_read_roles on public.ac_invoices for select to authenticated using(organisation_id=public.current_organisation_id() and public.current_ac_role() in ('owner','estimator','manager'));
drop policy if exists invoice_items_read_roles on public.ac_invoice_items;
create policy invoice_items_read_roles on public.ac_invoice_items for select to authenticated using(organisation_id=public.current_organisation_id() and public.current_ac_role() in ('owner','estimator','manager'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('invoice-pdfs','invoice-pdfs',false,20971520,array['application/pdf']) on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['application/pdf'];
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('invoice-assets','invoice-assets',false,2097152,array['image/png','image/jpeg']) on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/png','image/jpeg'];

drop policy if exists ac_invoice_storage_read on storage.objects;
create policy ac_invoice_storage_read on storage.objects for select to authenticated using(bucket_id in ('invoice-pdfs','invoice-assets') and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role() in ('owner','estimator','manager'));
drop policy if exists ac_invoice_pdf_insert on storage.objects;
create policy ac_invoice_pdf_insert on storage.objects for insert to authenticated with check(bucket_id='invoice-pdfs' and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role() in ('owner','estimator'));
drop policy if exists ac_invoice_pdf_update on storage.objects;
create policy ac_invoice_pdf_update on storage.objects for update to authenticated using(bucket_id='invoice-pdfs' and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role() in ('owner','estimator')) with check(bucket_id='invoice-pdfs' and split_part(name,'/',1)=public.current_organisation_id()::text);
drop policy if exists ac_invoice_asset_insert on storage.objects;
create policy ac_invoice_asset_insert on storage.objects for insert to authenticated with check(bucket_id='invoice-assets' and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role()='owner');
drop policy if exists ac_invoice_asset_update on storage.objects;
create policy ac_invoice_asset_update on storage.objects for update to authenticated using(bucket_id='invoice-assets' and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role()='owner') with check(bucket_id='invoice-assets' and split_part(name,'/',1)=public.current_organisation_id()::text);
drop policy if exists ac_invoice_storage_delete on storage.objects;
create policy ac_invoice_storage_delete on storage.objects for delete to authenticated using(bucket_id in ('invoice-pdfs','invoice-assets') and split_part(name,'/',1)=public.current_organisation_id()::text and public.current_ac_role()='owner');

revoke all on public.ac_invoice_settings,public.ac_invoice_counters,public.ac_invoices,public.ac_invoice_items from anon,authenticated;
revoke execute on function public.ac_invoice_require_role(text[]) from public,anon,authenticated;
revoke execute on function public.ac_invoice_calculate(jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.ac_invoice_json(uuid,boolean) from public,anon,authenticated;
revoke execute on function public.list_ac_invoices() from public,anon,authenticated;
revoke execute on function public.get_ac_invoice_settings() from public,anon,authenticated;
revoke execute on function public.upsert_ac_invoice_settings(jsonb) from public,anon,authenticated;
revoke execute on function public.create_ac_invoice_draft(jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.update_ac_invoice(uuid,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.delete_ac_invoice(uuid) from public,anon,authenticated;
revoke execute on function public.record_ac_invoice_pdf(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.list_ac_invoices() to authenticated;
grant execute on function public.get_ac_invoice_settings() to authenticated;
grant execute on function public.upsert_ac_invoice_settings(jsonb) to authenticated;
grant execute on function public.create_ac_invoice_draft(jsonb,jsonb) to authenticated;
grant execute on function public.update_ac_invoice(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.delete_ac_invoice(uuid) to authenticated;
grant execute on function public.record_ac_invoice_pdf(uuid,text,text,bigint) to authenticated;

comment on table public.ac_invoices is 'Team-isolated Alert Construction invoices. Direct table access is revoked; role-shaped reads use list_ac_invoices().';
comment on function public.list_ac_invoices() is 'Owner/Estimator receive internal pricing; Manager receives customer-safe read-only invoice data.';
