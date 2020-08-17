import { css, run } from "uebersicht";

const { directory, gitCommand, skipUnchanged } = require("./config.json");

export const command = `find ${directory} -maxdepth 1 -mindepth 1 -type d -exec sh -c '(echo {} && cd {} && ${gitCommand} && echo)' \\;`;

export const refreshFrequency = 5000;

export const widget_align = "left";

const dataContainer = css({
	textAlign: widget_align,
	position: "relative",
	clear: "both",
});
const repoItem = css({
	padding: "8px 2px",
});
const repoHeader = css({});
const repoChanges = css({
	listStyle: "none",
	minHeight: "0",
	paddingInlineStart: "10px",
	margin: 0,
});

const widgetTitle = css({
	textAlign: widget_align,
	fontSize: "14px",
	textTransform: "uppercase",
	fontWeight: "bold",
});
const label = css({
	fontSize: "12px",
	textTransform: "uppercase",
	fontWeight: "bold",
	marginBottom: "0",
});
const branchInfo = css({
	fontSize: "8px",
});
const changeItem = css({
	fontSize: "10px",
});

export const className = {
	// Position this where you want
	bottom: "10px",
	left: "10px",
	width: "300px",

	// Statistics text settings
	color: "#fff",
	fontFamily: "Helvetica Neue",
	background: "rgba(0, 0, 0, 0.5)",
	paddingLeft: "10px",
	padding: "10px 10px 15px",
	borderRadius: "5px",
};

export const render = ({ output, error }) => {
	output = output.replaceAll(directory, "");

	const lines = output.split("\n").filter((l) => l);

	let lastRepo = null;
	const repos = lines.reduce((result, line) => {
		if (line.startsWith("/")) {
			lastRepo = line.replaceAll("/", "");
			result[lastRepo] = {
				repoName: line,
				branch: {
					local: "",
					remote: "",
					diff: "",
				},
				added: [],
				deletions: [],
				modified: [],
				untracked: [],
				renames: [],
				others: [],
			};
		} else if (line.startsWith("##")) {
			const [_, local, remote, ...diff] = line
				.replaceAll("#", "")
				.replaceAll("...", " ")
				.split(" ");
			result[lastRepo].branch = {
				local,
				remote,
				diff: diff.join(" ").replace("[", "").replace("]", ""),
			};
		} else {
			const [_, changeType, fileName] = line.match(/(.{1,2}) (.*)/);
			switch (changeType.trim()) {
				case "A":
					result[lastRepo].added.push(fileName);
					break;
				case "D":
					result[lastRepo].deletions.push(fileName);
					break;
				case "M":
					result[lastRepo].modified.push(fileName);
					break;
				case "R":
					result[lastRepo].renames.push(fileName);
					break;
				case "??":
					result[lastRepo].untracked.push(fileName);
					break;

				default:
					result[lastRepo].others.push(`${changeType} ${fileName}`);
					break;
			}
		}
		return result;
	}, {});

	const status = Object.values(repos)
		.filter((repo) =>
			skipUnchanged
				? repo.added.length +
				  repo.deletions.length +
				  repo.modified.length +
				  repo.renames.length +
				  repo.untracked.length +
				  repo.others.length
				: true
		)
		.map((repo) => (
			<div className={repoItem}>
				{[
					<div className={repoHeader}>
						<p
							className={label}
							onClick={() => {
								console.log(`open ${directory}${repo.repoName}`);
								run(`open ${directory}${repo.repoName}`);
							}}
						>
							{repo.repoName}
						</p>
						<span className={branchInfo}>
							{repo.branch.local}
							{repo.branch.remote ? ` ➡️ ${repo.branch.remote}` : ""}
							{repo.branch.diff ? ` (❗${repo.branch.diff})` : ""}
						</span>
					</div>,
					<ul className={repoChanges}>
						{[
							...repo.added.map((a) => <li className={changeItem}>➕ {a}</li>),
							...repo.deletions.map((d) => (
								<li className={changeItem}>🗑️ {d}</li>
							)),
							...repo.modified.map((m) => (
								<li className={changeItem}>✏️ {m}</li>
							)),
							...repo.renames.map((r) => (
								<li className={changeItem}>🏷️ {r}</li>
							)),
							...repo.untracked.map((u) => (
								<li className={changeItem}>🆕 {u}</li>
							)),
							...repo.others.map((o) => <li className={changeItem}>❓ {o}</li>),
						]}
					</ul>,
				]}
			</div>
		));

	return error ? (
		<div className={dataContainer}>
			<h1 className={widgetTitle}>Something went wrong:</h1>
			<strong>{String(error)}</strong>
		</div>
	) : (
		<div className={dataContainer}>
			<div className={widgetTitle}>Git Repositories</div>
			{status}
		</div>
	);
};
