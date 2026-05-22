import axios from 'axios';

const body = {
  requestId: `REQ-BATCH-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`,
  room: '1.1.120',
  checkin: '2026-05-15T14:00:00Z',
  checkout: '2026-05-16T12:00:00Z',
  hotelId: 'master',
  waitMs: 5000,
  quantity: 2,
};

(async () => {
  try {
    console.log('POST -> http://localhost:3000/cheking/config/Chave');
    console.log('Payload:', JSON.stringify(body, null, 2));
    const resp = await axios.post('http://localhost:3000/cheking/config/Chave', body, { timeout: 60000 });
    console.log('Status:', resp.status);
    console.log('Data:', JSON.stringify(resp.data, null, 2));

    const op = resp.data?.dados?.operationId || (resp.data?.dados?.operationIds && resp.data.dados.operationIds[0]);
    if (op) {
      console.log('\nConsultando status para operationId =', op);
      const st = await axios.get(`http://localhost:3000/hotel/master/liberar-quarto/status/${op}`, { timeout: 60000 });
      console.log('Status GET:', st.status);
      console.log('Status Data:', JSON.stringify(st.data, null, 2));
    } else {
      console.log('Nenhum operationId retornado pela API local.');
    }
  } catch (err) {
    console.error('ERRO:', err.response?.status, err.response?.data || err.message);
    process.exit(1);
  }
})();
