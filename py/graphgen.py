# graphgen.py custom web version
import json
import sys
reload(sys)
sys.setdefaultencoding('utf-8')
import os
import re
import graphviz

current__major_version = 0


def get_input(args):
	if len(args) > 1:
		with open(args[1], "r") as f:
			item = json.loads(f.read())
			return item, args[1]
	else:
			print "type filename to be parsed e.g. graphgen.py <filename>"
			return False


class ValadationAssertionError(AssertionError):
		"""Raised for Valadation errors"""


class Validate:
	"""Class for Valadating Reliantree tree structure

	Args:
		item: A Reliantree tree structure as a dict

	Returns:
		True if valid, ValadationAssertionError is invalid
	Raises:
		ValadationAssertionError: if Reliantree tree structure is invalid
	"""
	def __init__(self, item):
		self.item = item

	def _version_string(self, Version):
		"""Internal function for valadating Version Numbers

		Args:
			Version: verson number as string
		Returns:
			True if valid, ValadationAssertionError is invalid
		Raises:
			ValadationAssertionError: if invalid
		"""
		v_number = re.match(ur'^(\d+?\.\d+?\.\d+G?)(?!\S)$', Version)
		if not v_number:
			# The version number is not valid (not in the format 1.1.1<G>)
			raise ValadationAssertionError("invalid version string number " +
									str(Version))
		elif int(v_number.group().split(".")[0]) > current__major_version:
			raise ValadationAssertionError("Major Version of: " +
					v_number.group() +
					" Greater than current " +
					str(current__major_version))
		else:
			return True

	def _valid_node(self, node):
		"""Internal function to valadate node exists inReliantree tree
		structure

		Args:
			tree_origin: the GUID of the origin node of the tree
		Returns:
			True if valid, ValadationAssertionError is invalid
		Raises:
			ValadationAssertionError: if invalid
		"""
		if node in self.item["nodes"].keys():
			return True
		else:
			raise ValadationAssertionError("treeOrigin " + node +
									" is not a node")

	def _valid_versions(self):
		"""Internal function to valadate versions named in Reliantree tree
		structure as well as the calculationMode

		Args:
			None
		Returns:
			True if valid, ValadationAssertionError is invalid
		Raises:
			ValadationAssertionError: if invalid
		"""
		try:
			self._version_string(self.item["reliantreeVersion"])
		except (ValadationAssertionError, KeyError) as e:
			raise ValadationAssertionError("Versioning Exception with" +
								"'reliantreeVersion'\n" + str(e))
		try:
			self._version_string(self.item["rtServerVersion"])
		except (ValadationAssertionError, KeyError) as e:
			raise ValadationAssertionError("Versioning Exception with" +
								"'rtServerVersion'\n" + str(e))
		try:
			for v in self.item["rtClientVersionList"]:
				self._version_string(v)
		except (ValadationAssertionError, KeyError) as e:
			raise ValadationAssertionError("Versioning Exception with" +
							"'rtClientVersionList'\n" + str(e))
		try:
			for v in self.item["rtServerVersionList"]:
				self._version_string(v)
		except (ValadationAssertionError, KeyError) as e:
			raise ValadationAssertionError("Versioning Exception with" +
							"'rtClientVersionList'\n" + str(e))
		try:
			mode = re.match(ur'^(up|down)$', self.item["calculationMode"])
			if not mode:
				raise ValadationAssertionError("calculationMode is invalid")
		except KeyError as e:
			ValadationAssertionError("calculationMode is missing " + str(e))
		return True

	def _valid_node_content(self, node):
		element_list = [
			("type", re.compile(ur'^(and|or|null)$')),
			("title", None),
			("description", None),
			("failureRate", re.compile(ur'^(\d+\.\d+)$')),
			("fixedRate", re.compile(ur'^(true|false)$'))
			]

		for element, regex in element_list:
			try:
				match = ""
				if regex is not None:
					match = re.match(regex, self.item["nodes"][node][element])
			except KeyError:
				raise ValadationAssertionError("missing value" +
								element + " for node" + node)
			if not match:
				# The value type is not valid (and, or, or empty)
				raise ValadationAssertionError("invalid value" +
								element + " for node " + node)
			return True

	def _valid_tree(self, node):
		"""Internal function to valadate tree in Reliantree tree node
		structure

		Args:
			None
		Returns:
			True if valid, ValadationAssertionError is invalid
		Raises:
			ValadationAssertionError: if invalid
		"""
		if self._valid_node(node) and self._valid_node_content(node):
			if not self.item["nodes"][node]["children"]:
				return True
			else:
				for n in self.item["nodes"][node]["children"]:
					self._valid_tree(n)
				return True

	def valid():
		# Check for mandatory items
		return True


def parse_input(item):
	dot = graphviz.Digraph()
	for i in item["nodes"]:
		if item["nodes"][i]["type"] is None:
			item["nodes"][i]["type"] = "null"
		span = 8
		words = item["nodes"][i]["description"].split(" ")
		desc = "\\n".join([" ".join(words[:6]), " ".join(words[6:])])
		dot.node(i, label=("{<f0>" +
			item["nodes"][i]["title"] +
			"|<f1>" +
			"GUID: " + i + "\l" +
			"Description: " + desc + "\l" +
			"Failure Rate: " + str(item["nodes"][i]["failureRate"]) + "\l" +
			"Fixed?: " + str(item["nodes"][i]["fixedRate"]) + "\l" +
			"|<f2>" + item["nodes"][i]["type"] + "\\n" +
			"}"), shape="Mrecord")
		for x in item["nodes"][i]["children"]:
			dot.edge(str(i), str(x))
	return dot


def display_output(item, dot, args):
	print "parsed JSON"
	print json.dumps(item,
				sort_keys=True,
				indent=4,
				separators=(',', ': ')) + "\n"
	print "print GraphViz DOT markup"
	print dot
	# Write outut to file
	filename = args[1].split("/", 1)[-1].split(".", 1)[0]
	try:
		dot.render(view=False, directory="out", filename=filename)
		os.remove("out/" + filename)
	except RuntimeError:
		print "Your need GraphViz installed to view the image!"
		raise


if __name__ == '__main__':
	if get_input(sys.argv) is not False:
			f, f_name = get_input(sys.argv)
	g_dot = parse_input(f)
	display_output(f, g_dot, sys.argv)
