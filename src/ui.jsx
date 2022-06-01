import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import "bootstrap/dist/css/bootstrap.min.css";
import "./theme.scss";
import { oscillators, scales } from "./music";
import { oscType, scale } from "./script.js";

let domContainer = document.querySelector("#UI");
const root = ReactDOM.createRoot(domContainer);

export function renderUI(state, isMobile) {
  root.render(UI(state, isMobile));
}

function UI(state, isMobile) {
  return (
    <div>
      <div>
        {state === "error" ? <ErrorScreen /> : null}
        {state === "menu" ? <SettingsMenu /> : null}
        {state === "title" ? <TitleScreen /> : null}
        {state === "loading" ? <LoadingScreen /> : null}
      </div>
      {isMobile ? <SettingsIcon /> : null}
    </div>
  );
}

class SettingsIcon extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    window.setState("menu");
  }

  render() {
    return (
      <div id="settingsIcon" onClick={this.handleClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="#fff"
          height="48"
          width="48"
          viewBox="0 0 64 64"
        >
          <path d="M19.4 44 18.4 37.7Q17.45 37.35 16.4 36.75Q15.35 36.15 14.55 35.5L8.65 38.2L4 30L9.4 26.05Q9.3 25.6 9.275 25.025Q9.25 24.45 9.25 24Q9.25 23.55 9.275 22.975Q9.3 22.4 9.4 21.95L4 18L8.65 9.8L14.55 12.5Q15.35 11.85 16.4 11.25Q17.45 10.65 18.4 10.35L19.4 4H28.6L29.6 10.3Q30.55 10.65 31.625 11.225Q32.7 11.8 33.45 12.5L39.35 9.8L44 18L38.6 21.85Q38.7 22.35 38.725 22.925Q38.75 23.5 38.75 24Q38.75 24.5 38.725 25.05Q38.7 25.6 38.6 26.1L44 30L39.35 38.2L33.45 35.5Q32.65 36.15 31.625 36.775Q30.6 37.4 29.6 37.7L28.6 44ZM24 30.5Q26.7 30.5 28.6 28.6Q30.5 26.7 30.5 24Q30.5 21.3 28.6 19.4Q26.7 17.5 24 17.5Q21.3 17.5 19.4 19.4Q17.5 21.3 17.5 24Q17.5 26.7 19.4 28.6Q21.3 30.5 24 30.5Z" />
        </svg>
      </div>
    );
  }
}

class ErrorScreen extends React.Component {
  render() {
    return (
      <div className="overlay" id="errorScreen">
        <div id="startHelp">
          sorry, your browser's no good :( <br />
          <br /> try with Chrome or Edge
        </div>
      </div>
    );
  }
}

class TitleScreen extends React.Component {
  render() {
    return (
      <div className="overlay">
        <h1 id="startTitle">forest</h1>
        <div id="startHelp">click to plant trees :)</div>
      </div>
    );
  }
}

class LoadingScreen extends React.Component {
  render() {
    return (
      <div className="overlay" id="loadScreen">
        <Spinner animation="border" />
      </div>
    );
  }
}

class SettingsMenu extends React.Component {
  constructor(props) {
    super(props);
    this.handleResume = this.handleResume.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  handleResume() {
    setState("playing");
  }

  handleReset() {
    clearTrees();
    setState("playing");
  }

  render() {
    return (
      <div className="overlay" id="menuScreen">
        <h2>forest</h2>
        <ScaleSelector />
        <OscSelector />
        <div id="actionButtons">
          <Button onClick={this.handleResume} variant="primary">
            Resume
          </Button>
          <Button onClick={this.handleReset} variant="primary">
            Reset
          </Button>
        </div>
      </div>
    );
  }
}

class OscSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = { osc: oscillators.pulse };
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(event) {
    let osc = oscillators[event];
    this.setState({ osc: osc });
    setOsc(event);
  }

  render() {
    const listItems = Object.keys(oscillators).map((osc) => (
      <Dropdown.Item key={osc} eventKey={osc}>
        {oscillators[osc].name}
      </Dropdown.Item>
    ));
    return (
      <Dropdown onSelect={this.handleSelect}>
        <label>Oscillator</label>
        <Dropdown.Toggle className="dropdownToggle" id="dropdown-basic">
          {oscType.name}
        </Dropdown.Toggle>
        <Dropdown.Menu className="dropdownMenu">{listItems}</Dropdown.Menu>
      </Dropdown>
    );
  }
}

class ScaleSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = { scale: scales.diatonic };
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(event) {
    let scale = scales[event];
    this.setState({ scale: scale });
    setScale(event);
  }

  render() {
    const listItems = Object.keys(scales).map((scale) => (
      <Dropdown.Item key={scale} eventKey={scale}>
        {scales[scale].name}
      </Dropdown.Item>
    ));
    return (
      <Dropdown onSelect={this.handleSelect}>
        <label>Scale</label>
        <Dropdown.Toggle className="dropdownToggle" id="dropdown-basic">
          {scale.name}
        </Dropdown.Toggle>

        <Dropdown.Menu className="dropdownMenu">{listItems}</Dropdown.Menu>
      </Dropdown>
    );
  }
}

renderUI("loading");
