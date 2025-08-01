const request = require('supertest');
const app = require('../index');

describe('Export API Tests', () => {
  // 测试健康检查
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  // 测试PDF导出
  describe('POST /api/export/pdf', () => {
    it('should export PDF from HTML', async () => {
      const htmlContent = '<h1>Test PDF Export</h1><p>This is a test document.</p>';
      
      const response = await request(app)
        .post('/api/export/pdf')
        .send({
          htmlContent,
          options: {
            format: 'A4',
            orientation: 'portrait'
          }
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body.length).toBeGreaterThan(0);
    }, 30000);

    it('should return error for empty content', async () => {
      const response = await request(app)
        .post('/api/export/pdf')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('HTML内容');
    });
  });

  // 测试Word导出
  describe('POST /api/export/word', () => {
    it('should export Word from schema', async () => {
      const schemaData = JSON.stringify({
        pages: [{
          id: '1',
          name: 'Test Page',
          components: [{
            id: '1',
            type: 'text',
            content: '<h1>Test Word Export</h1><p>This is a test document.</p>',
            style: {
              fontSize: 16,
              fontFamily: 'Arial',
              color: '#333333'
            }
          }]
        }],
        pageConfig: {
          pageSize: { width: 210, height: 297, unit: 'mm' }
        }
      });

      const response = await request(app)
        .post('/api/export/word')
        .send({
          schemaData,
          options: {
            pageSize: 'A4',
            orientation: 'portrait'
          }
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.body.length).toBeGreaterThan(0);
    }, 30000);
  });

  // 测试PPT导出
  describe('POST /api/export/ppt', () => {
    it('should export PPT from schema', async () => {
      const schemaData = JSON.stringify({
        pages: [{
          id: '1',
          name: 'Test Slide',
          components: [{
            id: '1',
            type: 'text',
            content: '<h1>Test PPT Export</h1><p>This is a test presentation.</p>',
            style: {
              fontSize: 18,
              fontFamily: 'Arial',
              color: '#333333'
            }
          }]
        }],
        pageConfig: {
          pageSize: { width: 210, height: 297, unit: 'mm' }
        }
      });

      const response = await request(app)
        .post('/api/export/ppt')
        .send({
          schemaData,
          options: {
            slideSize: 'LAYOUT_16x9',
            includePageTitles: true
          }
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(response.body.length).toBeGreaterThan(0);
    }, 30000);
  });

  // 测试批量导出
  describe('POST /api/export/batch', () => {
    it('should export multiple formats', async () => {
      const schemaData = JSON.stringify({
        pages: [{
          id: '1',
          name: 'Test Page',
          components: [{
            id: '1',
            type: 'text',
            content: '<h1>Test Batch Export</h1>',
            style: { fontSize: 16 }
          }]
        }],
        pageConfig: {
          pageSize: { width: 210, height: 297, unit: 'mm' }
        }
      });

      const response = await request(app)
        .post('/api/export/batch')
        .send({
          formats: ['pdf', 'word'],
          schemaData,
          options: {
            pdf: { format: 'A4' },
            word: { orientation: 'portrait' }
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('pdf');
      expect(response.body.results).toHaveProperty('word');
    }, 60000);
  });

  // 测试错误处理
  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/api/export/invalid')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/export/pdf')
        .send('invalid json')
        .expect(400);
    });
  });
});
