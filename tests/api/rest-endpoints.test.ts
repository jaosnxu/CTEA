import axios from 'axios';

const base = 'http://localhost:3000/api';

describe('CTEA REST Endpoints', () => {
  it('should return health OK', async () => {
    const res = await axios.get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });
});
