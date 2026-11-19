import { ChartQuery } from './chart-query';
import { compile } from './compile';
import { describe as describeQuery } from './describe';

const base: ChartQuery = { metric: 'requests', filters: [], look: 'line', rangeMinutes: 60 };
const q = (o: Partial<ChartQuery>): ChartQuery => ({ ...base, ...o });
const C = 'http_server_request_duration_seconds_count';
const B = 'http_server_request_duration_seconds_bucket';
const X = 'http_route!="/metrics"';

describe('compile', () => {
  it('requests default to per second', () => {
    expect(compile(base)).toBe(`sum (rate(${C}{${X}}[1m]))`);
  });

  it.each([
    ['second', `sum (rate(${C}{${X}}[1m]))`],
    ['minute', `sum (rate(${C}{${X}}[5m])) * 60`],
    ['hour', `sum (rate(${C}{${X}}[5m])) * 3600`],
  ] as const)('requests per %s', (speed, expected) => {
    expect(compile(q({ speed }))).toBe(expected);
  });

  it('requests split by endpoint', () => {
    expect(compile(q({ speed: 'second', splitBy: 'endpoint' }))).toBe(
      `sum by (http_route) (rate(${C}{${X}}[1m]))`,
    );
  });

  it('errors split by service', () => {
    expect(compile(q({ metric: 'errors', splitBy: 'service' }))).toBe(
      `sum by (job) (rate(${C}{http_response_status_code=~"5..",${X}}[1m]))`,
    );
  });

  it('errors per minute', () => {
    expect(compile(q({ metric: 'errors', speed: 'minute' }))).toBe(
      `sum (rate(${C}{http_response_status_code=~"5..",${X}}[5m])) * 60`,
    );
  });

  it('error rate %', () => {
    expect(compile(q({ metric: 'errorRate' }))).toBe(
      `100 * sum (rate(${C}{http_response_status_code=~"5..",${X}}[5m])) / sum (rate(${C}{${X}}[5m]))`,
    );
  });

  it('error rate split and filtered applies to both sides', () => {
    expect(
      compile(
        q({ metric: 'errorRate', splitBy: 'service', filters: [{ by: 'method', value: 'GET' }] }),
      ),
    ).toBe(
      `100 * sum by (job) (rate(${C}{http_request_method="GET",http_response_status_code=~"5..",${X}}[5m])) / sum by (job) (rate(${C}{http_request_method="GET",${X}}[5m]))`,
    );
  });

  it('response time defaults to p95', () => {
    expect(compile(q({ metric: 'responseTime' }))).toBe(
      `histogram_quantile(0.95, sum by (le) (rate(${B}{${X}}[5m])))`,
    );
  });

  it.each([
    [50, '0.5'],
    [95, '0.95'],
    [99, '0.99'],
  ] as const)('response time p%i', (percentile, num) => {
    expect(compile(q({ metric: 'responseTime', percentile }))).toContain(
      `histogram_quantile(${num},`,
    );
  });

  it('response time split by endpoint keeps le', () => {
    expect(compile(q({ metric: 'responseTime', splitBy: 'endpoint' }))).toBe(
      `histogram_quantile(0.95, sum by (le, http_route) (rate(${B}{${X}}[5m])))`,
    );
  });

  it('maps every filter dimension', () => {
    expect(
      compile(
        q({
          filters: [
            { by: 'service', value: 'orders-api' },
            { by: 'endpoint', value: '/orders' },
            { by: 'method', value: 'POST' },
            { by: 'status', value: '404' },
          ],
        }),
      ),
    ).toBe(
      `sum (rate(${C}{job="orders-api",http_route="/orders",http_request_method="POST",http_response_status_code="404"}[1m]))`,
    );
  });

  it('status 5xx becomes a regex', () => {
    expect(compile(q({ filters: [{ by: 'status', value: '5xx' }] }))).toBe(
      `sum (rate(${C}{http_response_status_code=~"5..",${X}}[1m]))`,
    );
  });

  it('escapes quotes and backslashes in label values', () => {
    expect(compile(q({ filters: [{ by: 'endpoint', value: 'a"b\\c' }] }))).toBe(
      `sum (rate(${C}{http_route="a\\"b\\\\c"}[1m]))`,
    );
  });
});

describe('describe', () => {
  it('reads like a sentence', () => {
    expect(describeQuery(q({ speed: 'minute', splitBy: 'endpoint' }))).toBe(
      'Requests, per minute, split by endpoint',
    );
    expect(describeQuery(q({ metric: 'responseTime', percentile: 99 }))).toBe(
      'Response time, 99th percentile',
    );
    expect(
      describeQuery(q({ metric: 'errorRate', filters: [{ by: 'service', value: 'orders-api' }] })),
    ).toBe('Error rate %, only service orders-api');
  });
});
