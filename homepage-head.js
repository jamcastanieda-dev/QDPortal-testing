// Get modal elements
const modal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const receivedLink = document.getElementById('receivedLink');
const releasedLink = document.getElementById('releasedLink');
const returnedLink = document.getElementById('returnedLink');

// URLs for each task and action
const links = {
  NCR: {
    received: 'ncr-head-received.php',
    released: 'ncr-head-released.php',
    returned: 'ncr-head-returned.php',
  },
  MRB: {
    received: 'mrb-head-received.php',
    released: 'mrb-head-released.php',
    returned: 'mrb-head-returned.php',
  },
  RCPA: {
    received: 'rcpa-head-received.php',
    released: 'rcpa-head-released.php',
    returned: 'rcpa-head-returned.php',
  },
  RFD: {
    received: 'rfd-head-received.php',
    released: 'rfd-head-released.php',
    returned: 'rfd-head-returned.php',
  },
};

// Open the Modal
function openModal(taskName) {
  if (!links[taskName]) {
    console.error(`No links available for ${taskName}`);
    return;
  }

  console.log(`Opening Modal for Task: ${taskName}`);
  modalTitle.innerText = `${taskName} Tasks`;
  
  // Set the links
  receivedLink.href = links[taskName].received;
  releasedLink.href = links[taskName].released;
  returnedLink.href = links[taskName].returned;

  // Display the modal
  modal.style.display = 'block';
}

// Add Click Event Using data-task
document.querySelectorAll('.task-label').forEach(task => {
  task.addEventListener('click', function () {
    const taskName = this.dataset.task;
    openModal(taskName);
  });
});

// Close Modal When Clicking Outside
window.onclick = function (event) {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};
