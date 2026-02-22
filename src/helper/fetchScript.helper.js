import axios from '../utils/axiosWrapper.js';

async function fetchScript(url) {
  const response = await axios.get(url);
  return response.data;
}

export default fetchScript;
