// debug-models.js
const API_KEY = "AIzaSyDsD1S874wjWyvj0UPqDbC58yLc0--KODQ"; 
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
  console.log("🔍 Checking available models for this key...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    
    if (data.error) {
      console.log("❌ API ERROR:");
      console.log(JSON.stringify(data.error, null, 2));
    } else {
      console.log("✅ SUCCESS! Here are the models you can use:");
      // Filter just to show the names
      const names = data.models?.map(m => m.name) || [];
      console.log(names);
    }
  } catch (err) {
    console.log("Network Error:", err);
  }
}

listModels();