-- Fluxo de status da OS: grava os horários de cada etapa e impede mexer em OS cancelada.
create or replace function public.os_status_flow()
returns trigger
language plpgsql
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if old.status = 'CANCELED' then
    raise exception 'OS cancelada não pode mudar de status' using errcode = '22023';
  end if;

  case new.status
    when 'WASHING' then
      new.started_at := coalesce(new.started_at, now());
      -- Quem começou a lavar fica como responsável (base da comissão), se ninguém foi escolhido antes.
      if new.employee_id is null and public.is_staff() then
        new.employee_id := auth.uid();
      end if;
    when 'READY' then new.finished_at := coalesce(new.finished_at, now());
    when 'DELIVERED' then
      new.finished_at := coalesce(new.finished_at, now());
      new.delivered_at := coalesce(new.delivered_at, now());
    when 'CANCELED' then
      new.canceled_at := now();
      if new.payment_status = 'PENDING' then
        new.payment_status := 'CANCELED';
      end if;
    else
      null;
  end case;
  return new;
end;
$$;

create trigger appointments_os_status_flow before update of status on public.appointments_os
  for each row execute function public.os_status_flow();
