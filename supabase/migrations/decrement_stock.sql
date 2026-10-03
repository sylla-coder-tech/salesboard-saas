-- Fonction RPC pour décrémenter le stock de façon atomique.
-- Utilise UPDATE stock = stock - p_quantite directement en base,
-- ce qui évite la race condition lors de ventes simultanées sur le même produit.
-- À exécuter dans Supabase : Dashboard → SQL Editor → New Query → coller et Run

create or replace function decrement_stock(
  p_produit_id  bigint,
  p_entreprise_id uuid,
  p_quantite    integer
)
returns void
language plpgsql
security definer
as $$
begin
  update produits
  set stock = stock - p_quantite
  where id = p_produit_id
    and entreprise_id = p_entreprise_id;

  if not found then
    raise exception 'Produit introuvable (id=%, entreprise=%)', p_produit_id, p_entreprise_id;
  end if;
end;
$$;
