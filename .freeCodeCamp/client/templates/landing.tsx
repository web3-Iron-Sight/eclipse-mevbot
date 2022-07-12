import Header from "../components/header";
import { Events, ProjectI, TestType } from "../types/index";
import { parseMarkdown } from "../utils";
import projects from "../../config/projects.json" assert { type: "json" };
import IntegratedProject from "./integrated-project";
import Project from "./project";
import "./landing.css";

import { useEffect, useState } from "react";

let socket: WebSocket;
if (process.env.GITPOD_WORKSPACE_URL) {
  socket = new WebSocket(
    process.env.GITPOD_WORKSPACE_URL.replace(/^https:\/\//, "wss://8080-") + ""
  );
} else {
  socket = new WebSocket("ws://localhost:8080");
}

export const Landing = () => {
  const [topic, setTopic] = useState("");
  const [project, setProject] = useState<ProjectI | null>(null);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [description, setDescription] = useState("");
  const [tests, setTests] = useState<TestType[]>([]);
  const [hints, setHints] = useState("");
  const [cons, setCons] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    socket.onopen = function (_event) {
      sock(Events.CONNECT);
    };
    socket.onmessage = function (event) {
      const parsedData: { event: keyof typeof handle; data: any } = parse(
        event.data
      );
      handle[parsedData.event]?.(parsedData.data);
    };

    return () => {
      console.log("socket closing");
      socket.close();
    };
  }, []);

  const handle = {
    "toggle-loader-animation": toggleLoaderAnimation,
    "update-test": updateTest,
    "update-tests": updateTests,
    "update-hints": updateHints,
    "update-console": updateConsole,
    "update-description": updateDescription,
    "update-project-heading": updateProjectHeading,
    "update-project": setProject,
    "reset-tests": resetTests,
  };

  function sock(type: Events, data = {}) {
    socket.send(parse({ event: type, data }));
  }

  function updateProject(project: ProjectI | null) {
    sock(Events.SELECT_PROJECT, { id: project?.id });
    setProject(project);
  }

  function updateProjectHeading({
    projectTopic,
    lessonNumber,
  }: {
    projectTopic: string;
    lessonNumber: number;
  }) {
    setTopic(projectTopic);
    setLessonNumber(lessonNumber);
  }

  function updateDescription({ description }: { description: string }) {
    setDescription(parseMarkdown(description));
  }

  function updateTests({ tests }: { tests: TestType[] }) {
    setTests(tests);
  }
  function updateTest({ test }: { test: TestType }) {
    setTests((ts) => ts.map((t) => (t.testId === test.testId ? test : t)));
  }
  function updateHints({ hints }: { hints: string }) {
    setHints(parseMarkdown(hints));
  }
  function updateConsole({ cons }: { cons: string }) {
    setCons((prev) => prev + "\n\n" + parseMarkdown(cons));
  }

  function resetTests() {
    setTests([]);
  }

  function toggleLoaderAnimation() {
    setIsLoading((prev) => !prev);
  }

  function runTests() {
    setCons("");
    sock(Events.RUN_TESTS);
  }
  function resetProject() {
    sock(Events.RESET_PROJECT);
  }
  function goToNextLesson() {
    sock(Events.GO_TO_NEXT_LESSON);
  }
  function goToPreviousLesson() {
    sock(Events.GO_TO_PREVIOUS_LESSON);
  }
  return (
    <>
      <Header updateProject={updateProject} />

      {project ? (
        project.isIntegrated ? (
          <IntegratedProject
            {...{
              cons,
              description,
              goToNextLesson,
              goToPreviousLesson,
              hints,
              isLoading,
              lessonNumber,
              title: project.title,
              resetProject,
              runTests,
              tests,
              topic,
            }}
          />
        ) : (
          <Project
            {...{
              cons,
              description,
              goToNextLesson,
              goToPreviousLesson,
              hints,
              isLoading,
              lessonNumber,
              title: project.title,
              resetProject,
              runTests,
              tests,
              topic,
            }}
          />
        )
      ) : (
        <Selection {...{ topic, sock }} />
      )}
    </>
  );
};

interface SelectionProps {
  topic: string;
  sock: (type: Events, data: {}) => void;
}

const Selection = ({ topic, sock }: SelectionProps) => {
  return (
    <>
      <h2>{topic}</h2>
      <p className="description">Yes, more Web3 hype! Woot!</p>
      <a className="faq" href="#">
        Link to FAQ related to course
      </a>
      <ul className="blocks">
        {projects.map((p, i) => {
          return <Block key={i} {...{ ...p, sock }} />;
        })}
      </ul>
    </>
  );
};

type BlockProps = {
  sock: SelectionProps["sock"];
} & ProjectI;

const Block = ({
  id,
  title,
  description,
  isIntegrated,
  isPublic,
  sock,
}: BlockProps) => {
  function selectProject() {
    sock(Events.SELECT_PROJECT, { id });
  }
  return (
    <li className="block">
      <button
        className="block-btn"
        onClick={selectProject}
        disabled={!isPublic}
        style={
          !isPublic ? { backgroundColor: "grey", cursor: "not-allowed" } : {}
        }
      >
        <h3>{title}</h3>
        <p>{isPublic ? description : <Tag text="Coming Soon" />}</p>
        {isIntegrated && <Badge />}
      </button>
    </li>
  );
};

const Tag = ({ text }: { text: string }) => {
  return <span className="tag">{text}</span>;
};

const Badge = () => {
  return <p style={{ fontSize: "18px", color: "#002ead" }}>&#127744;</p>;
};

function parse(objOrString: any) {
  if (typeof objOrString === "string") {
    return JSON.parse(objOrString);
  } else {
    return JSON.stringify(objOrString);
  }
}
