insert into public.system_settings (key, value, description) values
  (
    'contract_templates',
    '[
      {"id":"booking-standard","name":"Contrato de Booking Padrão","description":"Contrato padrão para apresentações de DJ","category":"contrato","enabled":true},
      {"id":"booking-international","name":"Contrato de Booking Internacional","description":"Contrato bilíngue para eventos internacionais","category":"contrato","enabled":true},
      {"id":"proposta-comercial","name":"Proposta Comercial","description":"Proposta de cachê e condições para produtores","category":"proposta","enabled":true},
      {"id":"rider-tecnico","name":"Rider Técnico","description":"Especificações técnicas e equipamentos","category":"rider","enabled":true},
      {"id":"recibo","name":"Recibo de Pagamento","description":"Recibo para pagamentos recebidos ou efetuados","category":"recibo","enabled":true},
      {"id":"aditivo","name":"Aditivo Contratual","description":"Alterações e adições a contratos existentes","category":"aditivo","enabled":true}
    ]'::jsonb,
    'Templates de contrato disponíveis na geração de documentos'
  ),
  (
    'automation_rules',
    '{
      "whatsapp_on_confirm": true,
      "whatsapp_payment_reminder_days": 3,
      "email_on_contract_sent": true,
      "google_calendar_auto_sync": true,
      "stripe_link_on_confirm": false
    }'::jsonb,
    'Gatilhos automáticos do sistema (WhatsApp, Email, Calendar, Stripe)'
  )
on conflict (key) do nothing;