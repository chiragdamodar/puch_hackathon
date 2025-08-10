# Plato MCP Server - Complete E2E Setup Guide

## Overview

This guide provides comprehensive setup instructions for the Plato MCP Server - a multi-service booking platform that integrates with Pucho.ai through the Model Context Protocol. The server provides unified access to food ordering (ONDC), ride booking (Namma Yatri), and movie booking (BookMyShow) services.

## Features

- **Food Ordering**: ONDC integration with Ed25519 digital signatures
- **Ride Booking**: Namma Yatri/Beckn protocol integration  
- **Movie Booking**: BookMyShow web scraping with rate limiting
- **MCP Authentication**: Bearer token validation for Pucho.ai
- **Multi-service API**: Unified API wrapper for all services
- **Rate Limiting**: Built-in request throttling and delays
- **Comprehensive Logging**: Winston-based logging with metrics

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- SQLite (for local database)
- Access to ONDC sandbox (optional for production keys)

## Installation

### 1. Clone and Setup

```bash
git clone <your-repository-url>
cd plato-mcp-server
npm install
```

### 2. Environment Configuration

The `.env` file has been pre-configured with sandbox values:

```bash
# Key Configuration Values
ONDC_API_KEY=sandbox_test_key                    # Mock API key for testing
ONDC_BASE_URL=https://mock.ondc.org             # ONDC mock server
NAMMA_YATRI_BASE_URL=https://api.sandbox.beckn.juspay.in
BOOKMYSHOW_BASE_URL=https://in.bookmyshow.com

# MCP Server Configuration for Pucho.ai
MCP_VALIDATE_PHONE_NUMBER=919876543210          # Your phone number for validation
MCP_BEARER_TOKEN=hackathon_test_token_2024      # Bearer token for MCP auth

# ONDC Digital Signature Configuration (Demo Keys from PDF)
ONDC_SIGNING_PRIVATE_KEY=lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ==
ONDC_SIGNING_PUBLIC_KEY=awGPjRK6i/Vg/lWr+0xObclVxlwZXvTjWYtlu6NeOHk=
ONDC_SUBSCRIBER_ID=example-buyer.app
ONDC_UNIQUE_KEY_ID=ed25519-key-001
```

### 3. Database Setup

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Create database schema
```

### 4. Build and Start

```bash
# Development mode (recommended for testing)
npm run dev

# Production build
npm run build
npm start
```

## Pucho.ai Integration

### Connect to Pucho.ai

Once your server is running and publicly accessible, connect it to Pucho.ai:

1. **Make Server Publicly Accessible**: Deploy to Vercel, Railway, or use ngrok for local testing
2. **Connect via Pucho.ai**: Use the following command in any Pucho conversation:

```
/mcp connect https://your-server-url.com hackathon_test_token_2024
```

3. **Verification**: Pucho.ai will call the `/tools/validate` endpoint to verify your bearer token

### Available Tools in Pucho.ai

After successful connection, these tools will be available:

#### 1. Food Ordering (`order_food`)
```
Find restaurants in Bangalore serving South Indian food under 300 rupees
```

#### 2. Ride Booking (`book_ride`) 
```
Get ride estimates from MG Road to Koramangala in Bangalore
```

#### 3. Movie Booking (`book_movie`)
```
Search for movies playing in Bangalore today
```

#### 4. Validation (`validate`)
```
Internal tool used by Pucho.ai for authentication
```

## API Usage Examples

### Health Check
```bash
curl http://localhost:3001/health
```

### List Available Tools
```bash
curl http://localhost:3001/tools
```

### Food Ordering
```bash
curl -X POST http://localhost:3001/tools/order_food \\
  -H "Content-Type: application/json" \\
  -d '{
    "location": "Bangalore", 
    "cuisine": "South Indian",
    "budget": 300
  }'
```

### Ride Booking
```bash
curl -X POST http://localhost:3001/tools/book_ride \\
  -H "Content-Type: application/json" \\
  -d '{
    "pickup": "MG Road, Bangalore",
    "destination": "Koramangala, Bangalore",
    "rideType": "auto"
  }'
```

### Movie Booking
```bash
curl -X POST http://localhost:3001/tools/book_movie \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "search_movies",
    "city": "Bangalore",
    "language": "English"
  }'
```

## Service Integrations

### ONDC Integration

- **Authentication**: Ed25519 digital signatures (as per ONDC API Keys Guide)
- **Mock Server**: Uses `https://mock.ondc.org` for testing
- **Real Integration**: Replace with actual ONDC sandbox credentials
- **Supported Actions**: search, init (for placing orders)

### Namma Yatri Integration

- **Protocol**: Beckn-based API calls
- **Mock Data**: Returns sample ride estimates for common Bangalore routes
- **Real Integration**: Uses Juspay's sandbox environment
- **Supported Vehicles**: Auto, Bike Taxi, Cab

### BookMyShow Integration

- **Method**: Respectful web scraping with delays
- **Rate Limiting**: 2-second delays between requests
- **Fallback**: Mock data when scraping fails
- **Cities**: Bangalore, Mumbai, Delhi, Chennai, Pune, etc.

## Troubleshooting

### Common Issues

#### 1. "Tool not found" Error
**Cause**: Tool name mismatch or server not fully initialized
**Solution**: Check available tools at `/tools` endpoint

#### 2. ONDC Authentication Failures
**Cause**: Invalid signing keys or malformed requests
**Solution**: 
- Use mock server for testing: `ONDC_BASE_URL=https://mock.ondc.org`
- Check private key format in `.env`
- Verify subscriber ID configuration

#### 3. BookMyShow Scraping Issues
**Cause**: Rate limiting or changed HTML structure
**Solution**:
- Increase `SCRAPING_DELAY_MS` in `.env`
- Server automatically falls back to mock data
- Check logs for specific scraping errors

#### 4. Pucho.ai Connection Failed
**Cause**: Server not publicly accessible or wrong bearer token
**Solution**:
- Ensure server is deployed with HTTPS
- Verify `MCP_BEARER_TOKEN` in `.env`
- Check server logs during connection attempt

#### 5. Database Errors
**Cause**: Missing Prisma client or database permissions
**Solution**:
```bash
npm run db:generate
npm run db:push
```

#### 6. Module Resolution Errors
**Cause**: TypeScript build issues or missing dependencies
**Solution**:
```bash
npm run clean
npm run build
# If build fails, use dev mode: npm run dev
```

### Logging and Debugging

- **Console Logs**: Development mode shows colored console output
- **File Logs**: Check `logs/combined.log` and `logs/error.log`
- **API Metrics**: Database tracks API call performance
- **Usage Stats**: `/health` endpoint shows basic server status

### Development Tips

1. **Use Development Mode**: `npm run dev` provides hot reloading
2. **Check TypeScript Errors**: Run `npm run build` to catch type errors
3. **Monitor Logs**: Watch `logs/combined.log` for detailed debugging
4. **Test Individual APIs**: Use cURL to test each service independently
5. **Mock Data**: All services provide realistic mock data for testing

## Production Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3001

# Update with real API keys
ONDC_API_KEY=your_real_ondc_api_key
ONDC_SUBSCRIBER_ID=your_registered_subscriber_id
ONDC_SIGNING_PRIVATE_KEY=your_real_private_key
ONDC_SIGNING_PUBLIC_KEY=your_real_public_key

# Update with your server URL
MCP_SERVER_URL=https://your-production-server.com
```

### Deployment Platforms

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Railway
```bash
railway login
railway deploy
```

#### Docker
```bash
docker build -t plato-mcp-server .
docker run -p 3001:3001 --env-file .env plato-mcp-server
```

### Security Considerations

1. **Environment Variables**: Never commit real API keys to version control
2. **HTTPS**: Always use HTTPS in production for MCP connections
3. **Rate Limiting**: Configure appropriate rate limits for your use case
4. **Error Handling**: Ensure sensitive information isn't leaked in error messages
5. **Logging**: Avoid logging sensitive user data or API keys

## Real API Integration

### ONDC Production Setup

1. **Register**: Complete ONDC participant registration
2. **Generate Keys**: Create Ed25519 key pair using OpenSSL or Beckn utils
3. **Update Config**: Replace sandbox keys with production keys
4. **Test**: Verify with actual ONDC sandbox before going live

### Namma Yatri Production

1. **Partnership**: Contact Juspay for production API access
2. **Authentication**: Implement proper authentication if required
3. **City Coverage**: Configure supported cities and routes

### BookMyShow Production

1. **Partnership**: Contact BookMyShow for official API access
2. **Alternative**: Continue with respectful scraping with proper rate limiting
3. **Monitoring**: Implement alerts for scraping failures

## Support and Contributing

- **Issues**: Report issues with detailed error logs
- **Features**: Submit feature requests with use cases
- **Documentation**: Help improve this guide based on your experience
- **Testing**: Test with different cities and edge cases

## License

MIT License - see LICENSE file for details

---

## Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] Repository cloned and dependencies installed
- [ ] Database generated and schema pushed
- [ ] Server running on http://localhost:3001
- [ ] Health check returns {"status": "healthy"}
- [ ] All 4 tools visible at `/tools` endpoint
- [ ] Validate tool accepts configured bearer token
- [ ] Server deployed publicly with HTTPS
- [ ] Connected to Pucho.ai successfully
- [ ] Test all three booking services through Pucho.ai

**Congratulations! Your Plato MCP Server is ready for the hackathon!** 🎉