const client = require('prom-client');

// Prometheus metric client registry
const registry = new client.Registry();

// Add default metrics to client registry
client.collectDefaultMetrics({ registry });

// ---- List of counters and metrics goes here ----

// http success (200/ok) case
const request_success_count = new client.Counter({
  name: 'hellojs_request_success_count',
  help: 'number of successful http requests',
});
registry.registerMetric(request_success_count);

// http fail (non 200) case
const request_fail_count = new client.Counter({
  name: 'hellojs_request_fail_count',
  help: 'number of failed http requests',
});
registry.registerMetric(request_fail_count);

// histogram for latency in seconds of fib calculation method
const request_latency_seconds = new client.Histogram({
  name: 'hellojs_request_latency_seconds',
  help: 'request latency in seconds',
  labelNames: ['route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60]
});
registry.registerMetric(request_latency_seconds);

module.exports = {
    registry,
    request_success_count,
    request_fail_count,
    request_latency_seconds
};

