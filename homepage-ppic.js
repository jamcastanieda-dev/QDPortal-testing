// Get modal elements
const modal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const receivedLink = document.getElementById('receivedLink');
const releasedLink = document.getElementById('releasedLink');

// URLs for each task and action
const links = {
  NCR: {
    received: 'ncr-ppic-received.php',
    released: 'ncr-ppic-released.php',
  },
  MRB: {
    received: 'mrb-head-received.php',
    released: 'mrb-head-released.php',
  },
  RCPA: {
    received: 'rcpa-head-received.php',
    released: 'rcpa-head-released.php',
  },
  Inspection: {
    received: 'inspection-head-received.php',
    released: 'inspection-head-released.php',
  },
  RFD: {
    received: 'rfd-head-received.php',
    released: 'rfd-head-released.php',
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
