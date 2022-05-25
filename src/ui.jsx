import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import "./theme.scss";
import { oscillators, scales } from "./music";

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
      <div>
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
          {this.state.osc.name}
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
          {this.state.scale.name}
        </Dropdown.Toggle>

        <Dropdown.Menu className="dropdownMenu">{listItems}</Dropdown.Menu>
      </Dropdown>
    );
  }
}

let domContainer = document.querySelector("#settings");
const root = ReactDOM.createRoot(domContainer);
const element = <SettingsMenu />;
root.render(element);
