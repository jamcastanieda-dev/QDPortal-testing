<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Procedures</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style-procedure-view.css">
</head>
<body>
  <div id="container">
    <div class="top-header">
      <div class="header-left">
        <h1>LEVEL I</h1>
        <div class="add-button">
          <a href="#"><p>ADD <img src="images/add-icon.png" alt="ADD"></p></a>
        </div>
      </div>
      <label>CONTROL OF NONCONFORMING PRODUCTS</label>
      <div class="header-right">
        <button id="remove">Remove</button>
        <button id="upload">Upload</button>
      </div>
    </div>
    <div class="wrap-grid">
      <div class="sidebar">
        <p>QIP01.001</p>
        <p>QIP02.001</p>
        <p>QIP02.002</p>
        <p>QIP03.005</p>
      </div>
      <iframe src="documents/sample.pdf" class="previewDocument">
        Your browser does not support inline PDFs. Please <a href="sample.pdf">download the PDF</a> to view it.
      </iframe>
    </div>
    <footer>
      <div class="line-bar"></div>
      <div class="footer-wrap">
        <div class="close-wrap">
          <div class="bottom-section">
            <a href="user-interface.php">
              <div class="home-icon"></div>
            </a>
          </div>
          <div class="file-icon">
            <ul>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
            </ul>
          </div>
        </div>
        <div class="info-table">
          <table>
            <tr>
              <td><?php echo date('m-d-Y'); ?></td>
              <td>
                <?php
                  function generateRandomVersion() {
                    $major = rand(0, 9);
                    $minor = rand(0, 9);
                    $patch = rand(0, 9);
                    return "$major.$minor.$patch";
                  }
                  echo generateRandomVersion();
                ?>
              </td>
              <td>Jose</td>
            </tr>
          </table>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>
