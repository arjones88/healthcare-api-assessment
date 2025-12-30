require('dotenv').config();

class ResilientAPIClient {
    constructor(baseURL, apiKey, options = {}) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.maxRetries = options.maxRetries || 5;
        this.initialDelay = options.initialDelay || 1000;
        this.requestsPerSecond = options.requestsPerSecond || 2;
        this.lastRequestTime = 0;
        this.pageSize = options.pageSize || 10;
    }

    async fetchWithRetries(url, attempt = 0) {
        try {
            await this.throttle();

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 429) {
                const delay = this.getBackoffDelay(attempt);
                console.log(`Rate limited. Retrying after ${delay}ms...`);
                await this.sleep(delay);
                return this.fetchWithRetry(url, attempt + 1);
            }

            if (response.status >= 500 && attempt < this.maxRetries) {
                const delay = this.getBackoffDelay(attempt);
                console.log(
                    `Server error (${response.status}). Retrying after ${delay}ms...`
                );
                await this.sleep(delay);
                return this.fetchWithRetry(url, attempt + 1);
            }

            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication failed. Check API key.');
            }

            if (!response.ok) {
                throw new Error(
                    `Request failed with status ${response.status}`
                );
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('Authentication failed')) {
                throw error;
            }
            if (attempt < this.maxRetries) {
                const delay = this.getBackoffDelay(attempt);
                console.log(
                    `Request failed: ${error.message}. Retrying in ${delay}ms...`
                );
                await this.sleep(delay);
                return this.fetchWithRetry(url, attempt + 1);
            }
            throw error;
        }
    }

    async fetchAllPatients() {
        const allPatients = [];
        let page = 1;
        let moreData = true;

        while (moreData) {
            try {
                const url = `${this.baseURL}?page=${page}&limit=${this.pageSize}`;
                console.log(`Fetching page ${url}`);

                const data = await this.fetchWithRetries(url);

                const patients = data || [];

                if (Array.isArray(patients) && patients.length > 0) {
                    allPatients.push(...patients);
                    console.log(
                        `Fetched ${patients.length} patients from page ${page} (total: ${allPatients.length})`
                    );
                } else {
                    moreData = false;
                    console.log('No more patient data');
                    break;
                }

                moreData = patients.length === this.pageSize;

                if (data.hasNext === false) {
                    moreData = false;
                }

                page++;
            } catch (error) {
                console.error(`Failed to fetch page ${page}:`, error.message);
                moreData = false;
            }

            console.log(`\n✓ Total patients fetched: ${allPatients.length}\n`);
            return allPatients;
        }
    }

    getBackoffDealy(attempt) {
        // Exponential backoff
        pass;
    }

    async throttle() {
        // rate limiting logic
        pass;
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
