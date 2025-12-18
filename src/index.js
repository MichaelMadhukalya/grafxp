const express = require('express');
const fs = require('fs');
const os = require('os');

const logger = require('./util');
const {
    registry,
    request_success_count,
    request_fail_count,
    request_latency_seconds
} = require('./metrics');

const app = express();
const PORT = 8300;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// file data read once and cached for subsequent operations. Line terminators are stripped away
let lines = null

// Start server
app.listen(PORT, () => {
    logger.info(`Node listening on port ${PORT}`);
});

// Root endpoint
app.get('/', (req, res) => {
    request_success_count.inc();
    logger.info(`Node (express) running on port ${PORT}`);
    res.status(200).json({ message: `Node (express) running on ${PORT}` });
});

// Liveness probe
app.get('/ping', (req, res) => {
    res.status(200).json({ message: 'OK' });
});

// Search endpoint
app.post('/api/v1/search', (req, res) => {
    const end = request_latency_seconds.startTimer({ route: '/search' });

    const { searchTerm } = req.body;
    logger.info(`Received search request: ${searchTerm}`);

    let result = null;
    if (lines != null && Array.isArray(lines) && lines.length > 0) {
        result = lines.filter(line => line.includes(searchTerm));
    } else {
        result = searchFile('poem.txt', searchTerm);
    }

    if (result != null && Array.isArray(result) && result.length > 0) {
        request_success_count.inc();
        logger.info(`Search term found: ${searchTerm}`);
        end();
        return res.status(200).json({
            message: `Search term found`,
            matches: result
        });
    }

    if (Array.isArray(result) && result.length === 0) {
        request_fail_count.inc();
        logger.info(`Search term not found: ${searchTerm}`);
        end();
        return res.status(200).json({
            message: `Search term not found`
        });
    }

    request_fail_count.inc();
    logger.error(`Search operation failed for term: ${searchTerm}`);
    end();
    return res.status(500).json({
        message: `Failed to search term ${searchTerm}`
    });
});

// Fibonacci endpoint
app.get('/api/v1/fib/:num', (req, res) => {
    const end = request_latency_seconds.startTimer({ route: '/fib/:num' });

    const num = Number(req.params.num);
    if (!Number.isInteger(num) || num < 1) {
        request_fail_count.inc();
        logger.error(`Invalid Fibonacci argument: ${num}`);
        end();
        return res.status(400).json({ message: `Number must be a positive integer` });
    }

    if (num > 45) {
        request_fail_count.inc();
        logger.error(`Fibonacci number too large to compute safely: ${num}`);
        end();
        return res.status(400).json({ message: `Number too large to compute (max 45)` });
    }

    const value = fibonacci(num);
    logger.info(`Fibonacci(${num}) = ${value}`);

    request_success_count.inc();
    end();

    res.status(200).json({
        message: `The ${num}th Fibonacci number is: ${value}`
    });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

// --- Helper Functions ---

/**
 * Search for a term inside a file.
 */
function searchFile(filePath, searchTerm) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        lines = data.split('\n');
        return lines.filter(line => line.includes(searchTerm));
    } catch (err) {
        logger.error(`Error reading/searching file ${filePath}: ${err}`);
        return null;
    }
}

/**
 * Recursive Fibonacci (safe for n <= 45)
 */
function fibonacci(n) {
    return n <= 2 ? 1 : fibonacci(n - 1) + fibonacci(n - 2);
}

