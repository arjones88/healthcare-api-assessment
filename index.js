import { setTimeout } from 'node:timers/promises';

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

    getBackoffDelay(attempt) {
        // Exponential backoff with jitter
        const exponDelay = this.initialDelay * 2 ** attempt;
        const jitter = Math.random() * 1000;
        return Math.min(exponDelay + jitter, 30000);
    }

    async throttle() {
        // rate limiting logic
        const minInterval = 1000 / this.requestsPerSecond;
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            await this.sleep(waitTime);
        }

        this.lastRequestTime = Date.now();
    }

    sleep(ms) {
        return setTimeout(ms);
    }
}

class DataValidator {
    static validateBloodPressure(bpString) {
        if (!bpString || typeof bpString !== 'string') {
            return { systolic: null, diastolic: null, isValid: false };
        }

        const match = bpString.match(/^(\d+)?\/(\d+)?$/);

        if (!match) {
            return { systolic: null, diastolic: null, isValid: false };
        }

        const systolic = match[1] ? parseInt(match[1], 10) : null;
        const diastolic = match[2] ? parseInt(match[2], 10) : null;

        const isValid = systolic !== null && diastolic !== null;

        return { systolic, diastolic, isValid };
    }

    static validateTemperature(temp) {
        const numValue = parseFloat(temp);

        const isValid = !isNaN(numValue) && numValue >= 90 && numValue <= 120;

        return { value: isValid ? numValue : null, isValid };
    }

    static validateAge(age) {
        const numValue = parseInt(age, 10);
        const isValid = !isNaN(numValue) && numValue > 0 && numValue < 120;

        return { value: isValid ? numValue : null, isValid };
    }
}

class RiskAssessment {
    static calculateBloodPressureRisk(systolic, diastolic) {
        if (systolic === null || diastolic === null) return 0;
        if (systolic < 120 && diastolic < 80) return 0;
        if (systolic < 130 && diastolic < 80) return 1;
        if (systolic < 140 || diastolic < 90) return 2;
        if (systolic >= 140 || diastolic >= 90) return 3;
    }

    static calculateTemperatureRisk(temperature) {
        if (temperature === null) return 0;
        if (temperature < 99.5) return 0;
        if (temperature < 101.0) return 1;
        if (temperature >= 101.0) return 2;
    }

    static calculateAgeRisk(age) {
        if (age === null) return 0;
        if (age < 40) return 0;
        if (age <= 65) return 1;
        if (age > 65) return 2;
    }

    calculateTotalRisk(patient) {
        // Calculate total risk score
        pass;
    }
}
