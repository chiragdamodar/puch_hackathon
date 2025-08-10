// test-integration.js - Simple integration test script
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testServerHealth() {
  try {
    console.log('🏥 Testing server health...');
    const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
    console.log('✅ Server health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function testMCPValidation() {
  try {
    console.log('🔐 Testing MCP validation tool...');
    const response = await axios.post('http://localhost:3001/tools/validate', {
      token: process.env.MCP_BEARER_TOKEN
    }, { timeout: 10000 });
    
    console.log('✅ MCP validation test passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ MCP validation test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFoodOrdering() {
  try {
    console.log('🍽️ Testing food ordering tool...');
    const response = await axios.post('http://localhost:3001/tools/order_food', {
      location: 'Bangalore',
      cuisine: 'South Indian',
      budget: 300
    }, { timeout: 15000 });
    
    console.log('✅ Food ordering test passed:', response.data.success ? 'SUCCESS' : 'FAILED');
    if (response.data.data?.restaurants) {
      console.log(`   Found ${response.data.data.restaurants.length} restaurants`);
    }
    return response.data.success;
  } catch (error) {
    console.log('❌ Food ordering test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRideBooking() {
  try {
    console.log('🚗 Testing ride booking tool...');
    const response = await axios.post('http://localhost:3001/tools/book_ride', {
      pickup: 'MG Road, Bangalore',
      destination: 'Koramangala, Bangalore',
      rideType: 'auto'
    }, { timeout: 15000 });
    
    console.log('✅ Ride booking test passed:', response.data.success ? 'SUCCESS' : 'FAILED');
    if (response.data.data?.estimates) {
      console.log(`   Found ${response.data.data.estimates.length} ride estimates`);
    }
    return response.data.success;
  } catch (error) {
    console.log('❌ Ride booking test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMovieBooking() {
  try {
    console.log('🎬 Testing movie booking tool...');
    const response = await axios.post('http://localhost:3001/tools/book_movie', {
      action: 'search_movies',
      city: 'Bangalore',
      language: 'English'
    }, { timeout: 15000 });
    
    console.log('✅ Movie booking test passed:', response.data.success ? 'SUCCESS' : 'FAILED');
    if (response.data.data?.results) {
      console.log(`   Found ${response.data.data.results.length} movies`);
    }
    return response.data.success;
  } catch (error) {
    console.log('❌ Movie booking test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testToolsList() {
  try {
    console.log('📋 Testing tools list endpoint...');
    const response = await axios.get('http://localhost:3001/tools', { timeout: 5000 });
    
    console.log('✅ Tools list test passed');
    console.log(`   Available tools: ${response.data.tools.map(t => t.name).join(', ')}`);
    return true;
  } catch (error) {
    console.log('❌ Tools list test failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Plato MCP Server Integration Tests');
  console.log('=' .repeat(50));

  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Tools List', fn: testToolsList },
    { name: 'MCP Validation', fn: testMCPValidation },
    { name: 'Food Ordering', fn: testFoodOrdering },
    { name: 'Ride Booking', fn: testRideBooking },
    { name: 'Movie Booking', fn: testMovieBooking },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} test error:`, error.message);
      failed++;
    }
    console.log(''); // Add spacing between tests
  }

  console.log('=' .repeat(50));
  console.log(`📊 Integration Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (passed === tests.length) {
    console.log('🎉 All integration tests passed! The MCP server is ready for Pucho.ai!');
    console.log('\nNext steps:');
    console.log('1. Deploy the server to make it publicly accessible');
    console.log('2. Connect to Pucho.ai using: /mcp connect <your-server-url> ' + process.env.MCP_BEARER_TOKEN);
    console.log('3. Test the tools in Pucho.ai chat interface');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }

  return passed === tests.length;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests if server is not running, show instructions
console.log('⏳ Waiting 3 seconds for server to be ready...');
setTimeout(runIntegrationTests, 3000);