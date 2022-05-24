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
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    setState("playing");
  }

  render() {
    return (
      <div>
        <ScaleSelector />
        <OscSelector />
        <Button onClick={this.handleClick} variant="primary">
          Resume
        </Button>
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
    return (
      <Dropdown onSelect={this.handleSelect}>
        <label>Oscillator</label>
        <Dropdown.Toggle className="dropdownToggle" id="dropdown-basic">
          {this.state.osc.name}
        </Dropdown.Toggle>

        <Dropdown.Menu className="dropdownMenu">
          <Dropdown.Item eventKey="pulse">Pulse</Dropdown.Item>
          <Dropdown.Item eventKey="sine">Sine</Dropdown.Item>
          <Dropdown.Item eventKey="sawtooth">Saw</Dropdown.Item>
          <Dropdown.Item eventKey="triangle">Triangle</Dropdown.Item>
          <Dropdown.Item eventKey="square">Square</Dropdown.Item>
        </Dropdown.Menu>
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
    return (
      <Dropdown onSelect={this.handleSelect}>
        <label>Scale</label>
        <Dropdown.Toggle className="dropdownToggle" id="dropdown-basic">
          {this.state.scale.name}
        </Dropdown.Toggle>

        <Dropdown.Menu className="dropdownMenu">
          <Dropdown.Item eventKey="diatonic">Diatonic</Dropdown.Item>
          <Dropdown.Item eventKey="pentatonic">Pentatonic</Dropdown.Item>
          <Dropdown.Item eventKey="wholeTone">Whole Tone</Dropdown.Item>
          <Dropdown.Item eventKey="hirajoshi">Hirajoshi</Dropdown.Item>
          <Dropdown.Item eventKey="iwato">Iwato</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

let domContainer = document.querySelector("#settings");
const root = ReactDOM.createRoot(domContainer);
const element = <SettingsMenu />;
root.render(element);
