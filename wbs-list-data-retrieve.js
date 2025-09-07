const wbsDropdown = document.getElementById('wbsDropdown');
const searchContainer = document.getElementById('searchContainer');
const wbsInput = document.getElementById('wbsInput');
const wbsSearch = document.getElementById('wbsSearch');
let wbsData = [];

// Fetch WBS Data from the backend
async function fetchWbsData() {
  try {
    const response = await fetch('wbs-list-retrieve.php');
    const data = await response.json();
    wbsData = data;
  } catch (error) {
    console.error('Error fetching WBS data:', error);
  }
}

fetchWbsData();

function toggleSearchBar(event) {
  event.preventDefault();
  wbsSearch.value = '';
  wbsDropdown.innerHTML = '';
  hideDropdown();

  if (!searchContainer.classList.contains('visible')) {
    searchContainer.style.width = `${wbsInput.offsetWidth}px`;
    searchContainer.classList.add('visible');
    wbsInput.style.display = 'none';
    wbsSearch.focus();
  }
}

function filterOptions() {
  const input = wbsSearch.value.trim();
  wbsDropdown.innerHTML = '';

  const filteredData = wbsData.filter(item =>
    item.wbs.toLowerCase().includes(input.toLowerCase())
  );

  if (filteredData.length === 0) {
    hideDropdown();
    return;
  }

  filteredData.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('option');
    div.textContent = item.wbs;
    div.dataset.value = item.wbs;
    div.onclick = () => selectOption(item.wbs);
    wbsDropdown.appendChild(div);
  });

  showDropdown();
}

function selectOption(wbsName) {
  wbsInput.value = wbsName;
  wbsInput.style.display = 'block';
  hideSearchBar();
}

function showDropdown() {
  wbsDropdown.classList.add('visible');
}

function hideDropdown() {
  wbsDropdown.classList.remove('visible');
}

function hideSearchBar() {
  searchContainer.classList.remove('visible');
  hideDropdown();
}

window.addEventListener('click', function(event) {
  if (!searchContainer.contains(event.target) && !wbsInput.contains(event.target)) {
    wbsInput.style.display = 'block';
    hideSearchBar();
  }
});