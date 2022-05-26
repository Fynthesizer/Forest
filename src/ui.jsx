import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import "./theme.scss";
import { oscillators, scales } from "./music";
import { oscType, scale } from "./script.js";

let domContainer = document.querySelector("#UI");
const root = ReactDOM.createRoot(domContainer);

export function renderUI(state) {
  root.render(UI(state));
}

function UI(state) {
  return (
    <div>
      {state === "menu" ? <SettingsMenu /> : null}
      {state === "title" ? <TitleScreen /> : null}
      {state === "loading" ? <LoadingScreen /> : null}
    </div>
  );
}

/*
export class UI extends React.Component {
  constructor(props) {
    super(props);
    this.state = { state: state };
  }

  componentDidMount() {
    this.setState({ state: state });
    console.log("mount");
  }
  componentDidUpdate() {
    console.log("update");
    console.log(state);
  }

  render() {
    //if (this.state.state != state) this.setState({ state: state });
    return (
      <div>
        {state === "menu" ? <SettingsMenu /> : null}
        {state === "title" ? <TitleScreen /> : null}
        {state === "loading" ? <LoadingScreen /> : null}
      </div>
    );
  }
}
*/

class TitleScreen extends React.Component {
  render() {
    return (
      <div className="overlay">
        <div id="startTitle">Forest</div>
        <div id="startHelp">click to plant trees</div>
      </div>
    );
  }
}

class LoadingScreen extends React.Component {
  render() {
    return (
      <div className="overlay">
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
