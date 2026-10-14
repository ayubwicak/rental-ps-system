const axios = require("axios");
const config = require("../config/config");
const logger = require("../utils/logger");

class RentalApiService {
  constructor() {
    this.token = null;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 8000,
    });
  }

  async login() {
    try {
      logger.info("RentalAPI", `Attempting login to ${config.apiUrl} as user: ${config.apiUsername}`);
      const res = await this.client.post("/auth/login", {
        username: config.apiUsername,
        password: config.apiPassword,
      });
      if (res.data && res.data.token) {
        this.token = res.data.token;
        logger.info("RentalAPI", "Login successful. JWT token stored.");
        return this.token;
      }
      throw new Error("Token tidak ditemukan dalam respons login.");
    } catch (err) {
      logger.error("RentalAPI", "Failed to login to backend API", err);
      throw err;
    }
  }

  async getAuthHeaders() {
    if (!this.token) {
      await this.login();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async requestWithRetry(method, url, data = null, params = null) {
    try {
      const headers = await this.getAuthHeaders();
      const configObj = { headers, params };
      let res;
      if (method === "get") {
        res = await this.client.get(url, configObj);
      } else if (method === "post") {
        res = await this.client.post(url, data, configObj);
      }
      return res.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logger.warn("RentalAPI", "Token expired or 401 received. Retrying login once...");
        this.token = null;
        const headers = await this.getAuthHeaders();
        const configObj = { headers, params };
        const res = method === "get" 
          ? await this.client.get(url, configObj)
          : await this.client.post(url, data, configObj);
        return res.data;
      }
      throw err;
    }
  }

  async getUnits() {
    try {
      return await this.requestWithRetry("get", "/units");
    } catch (err) {
      logger.error("RentalAPI", "getUnits error", err);
      throw err;
    }
  }

  async checkAvailability(date, time, durationHours = 1, type = "") {
    try {
      return await this.requestWithRetry("get", "/bookings/availability", null, {
        date,
        time,
        durationHours,
        type,
      });
    } catch (err) {
      logger.error("RentalAPI", "checkAvailability error", err);
      throw err;
    }
  }

  async createBooking(bookingData) {
    // bookingData: { customerName, unitId, date, time, durationHours }
    try {
      logger.info("RentalAPI", "Submitting new booking to backend API", bookingData);
      return await this.requestWithRetry("post", "/bookings", bookingData);
    } catch (err) {
      logger.error("RentalAPI", "createBooking error", err);
      throw err;
    }
  }

  async getBookingById(bookingId) {
    try {
      return await this.requestWithRetry("get", `/bookings/${bookingId}`);
    } catch (err) {
      logger.error("RentalAPI", "getBookingById error", err);
      throw err;
    }
  }

  async cancelBooking(bookingId) {
    try {
      return await this.requestWithRetry("post", `/bookings/${bookingId}/cancel`);
    } catch (err) {
      logger.error("RentalAPI", "cancelBooking error", err);
      throw err;
    }
  }

  async getInfo() {
    try {
      const res = await this.client.get("/info");
      return res.data;
    } catch (err) {
      logger.error("RentalAPI", "getInfo error", err);
      return {
        name: "Rental PS System",
        address: "Jl. Pemuda No. 123",
        operatingHours: "09:00 - 24:00 WIB",
        adminContact: config.adminPhone,
      };
    }
  }
}

module.exports = new RentalApiService();
