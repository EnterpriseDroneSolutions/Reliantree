<?php
/*
previz.php - Online Graphviz interface, intended for use with the Reliantree Client.
Copyright (c) 2016 Enterprise Drone Solutions, LLC

This file is part of Reliantree, which is licensed under the GNU Affero General Public License version 3.
You should have received a copy of this license along with Reliantree.  If not, see <http://www.gnu.org/licenses/>.
*/

$suberror = '';
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	if (!empty($_POST["rtJSON"])) {
		if (json_decode($_POST["rtJSON"]) != null) {
			chdir("py");
			$fileID = uniqid();
			$interFile = fopen("./in/".$fileID,"w");
			fwrite($interFile, $_POST["rtJSON"]);
			fclose($interFile);
			exec("python graphgen.py in/".$fileID);
			unlink("./in/".$fileID);
			header("Location: ./py/out/".$fileID.".pdf");
		} else {
			$suberror = "Invalid submission!";
		}
	} else {
		$suberror = "No submission!";
	}
}
?>
<html>
	<head>
		<title>Reliantree Previz Interface</title>
		<link rel="stylesheet" type="text/css" href="css/previz.css" />
		<!--
		<link rel="icon" type="image/png" href="./img/favicon.ico" />
		-->
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js"></script>
		<script>window.jQuery || document.write('<script src="js/jquery.min.js"><\/script>')</script>
		<script src="js/guid.js"></script>
		<script src="js/big.min.js"></script>
		<script src="js/rt-tree.js"></script>
		<script src="js/tests.js"></script>
		<script defer>
			function genTree(){
				$("#treeReceptacle").val(JSON.stringify(generateValidTree()));
			}
			//document.getElementById('main').submit(); return false;
		</script>
	</head>
	<body>
		<form action="previz.php" target="_blank" method="post" id="main">
			<div id="topbar" class="loginbar noselect">Reliantree <i>Previz</i></div>
			<?php
			if($suberror){
				echo "<div class=\"errbar\">".$suberror."</div>";
			}
			?>
			<div id="content">
				This is a simple test interface for <b>Previz:</b> the simple web interface for <b>Graphgen:</b> the simple tool for converting Reliantrees to <b>Dot:</b> the format used by <b>Graphviz:</b> the simple solution for displaying flowmaps, charts, and... trees!
				<br/>
				<br/>
				<hr/>
				<div class="mini">100% Not Ripped From Competix, Guaranteed</div>
			</div>
			<input id="treeReceptacle" name="rtJSON" type="hidden" value="" />
			<button type="submit" id="bottombar" class="loginbar noselect" onclick="genTree()">Generate Tree!&nbsp;&nbsp;</button>
			<div id="footer">Reliantree &copy;2016 Enterprise Drone Solutions, LLC</div>
		</div>
	</body>
</html>