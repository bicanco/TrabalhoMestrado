import * as d3 from 'd3';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { useForm, useWatch } from 'react-hook-form';

import SelectFile from '@components/select-file/SelectFile';

export default function Parallel() {
  const chart = useRef<SVGSVGElement>(null);
  const { register, control, getValues } = useForm();
  const watch = useWatch({ control });
  const [colors, setColors] = useState<any[]>([]);
  const [nFeatures, setNFeatures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [resp, setResp] = useState<any>();
  const [displayColorPicker, setDisplayColorPicker] = useState<any>();
  const [draw, setDraw] = useState<boolean>();

  useEffect(() => {
    const radio = getValues('radio');
    if (!radio) {
      return;
    }
    const newClasses: any[] = nFeatures?.find(item => item.feature === radio)?.values;
    const length = newClasses.length;

    if (length && length < 1)
      return;
    const newColors: string[] = [];
    const firstColor = { red: 178, green: 24, blue: 43 };
    const middleColor = { red: 247, green: 247, blue: 247 };
    const lastColor = { red: 33, green: 102, blue: 172 };
    const middle = Math.floor(newClasses.length / 2);
    const factor1 = {
      red: Math.floor((middleColor.red - firstColor.red) / middle),
      green: Math.floor((middleColor.green - firstColor.green) / middle),
      blue: Math.floor((middleColor.blue - firstColor.blue) / middle),
    };
    const factor2 = {
      red: Math.floor((middleColor.red - lastColor.red) / middle),
      green: Math.floor((middleColor.green - lastColor.green) / middle),
      blue: Math.floor((middleColor.blue - lastColor.blue) / middle),
    };

    for (let i = 0; i < length; i++) {
      if (i < middle) {
        newColors.push(
          `#${(firstColor.red + factor1.red * i).toString(16)}` +
          `${(firstColor.green + factor1.green * i).toString(16)}` +
          `${(firstColor.blue + factor1.blue * i).toString(16)}`
        );
      } else {
        const aux = middle - length + i + 1;
        console.log(i, aux);
        newColors.push(
          `#${(middleColor.red - factor2.red * aux).toString(16)}` +
          `${(middleColor.green - factor2.green * aux).toString(16)}` +
          `${(middleColor.blue - factor2.blue * aux).toString(16)}`
        );
      }
    }
    setColors(newColors);
    setClasses(newClasses);
  }, [watch]);

  useEffect(() => {
    if (draw) {
      drawChart();
    }
  }, [draw]);

  const renderFeatures = useCallback(() => {
    return nFeatures?.map((item: any) => {
      const name = item.feature;
      return (<>
        <div className="form-check">
          <input className="form-check-input" type="radio" {...register('radio')} value={name} />
          <label className="form-check-label" htmlFor="flexRadioDefault1">
            {name}
          </label>
        </div>
      </>);
    });
  }, [nFeatures]);

  const getColorClass = (selected: string) => {
    return `color${classes.findIndex((item) => item === selected)}`;
  };

  const getColorScale = () => {
    const dimensions = resp.numericFeatures.map((feature: any) => feature.feature);
    return d3.scaleOrdinal()
      .domain(dimensions)
      .range(colors);
  };

  const drawChart = () => {
    const width = 500;
    const features = resp.numericFeatures;
    const height = 125 * features.length;
    const margin = 20;
    const svg = d3.select(chart.current);
    const key = getValues('radio');
    const data = resp!.data;
    svg.selectAll('*').remove();

    svg
      .attr('width', width + 2 * margin)
      .attr('height', height + 2 * margin)
      .append('g')
      .attr('transform',
        'translate(' + margin + ',' + margin + ')');


    const dimensions = features.map((feature: any) => feature.feature);

    const color = d3.scaleOrdinal()
      .domain(dimensions)
      .range(colors);

    const y: { [key: string]: any; } = {};
    features.forEach((item: any) => {
      const name = item.feature;
      y[name] = d3.scaleLinear()
        .domain([item.min, item.max])
        .range([height - margin, margin]);
    });

    const x = d3.scalePoint()
      .range([margin, width - margin])
      .domain(dimensions);

    const path = (d: any) => {
      return d3.line()(dimensions.map((p: any): any => { return [x(p), y[p](d[p])]; }));
    };

    const highlight = function (_event: any, d: any) {
      const selected_data = d[key];

      d3.selectAll('.line')
        .transition().duration(200)
        .style('stroke', 'lightgrey')
        .style('opacity', '0.2');
      d3.selectAll('.' + getColorClass(selected_data))
        .transition().duration(200)
        .style('stroke', color(selected_data) as any)
        .style('opacity', '1');
    };

    const doNotHighlight = function (): any {
      d3.selectAll('.line')
        .transition().duration(200).delay(1000)
        .style('stroke', function (d: any): any { return (color(d[key])); })
        .style('opacity', '1');
    };

    svg
      .selectAll('myPath')
      .data(data)
      .enter()
      .append('path')
      .attr('class', function (d: any) { return 'line ' + getColorClass(d[key]); })
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', 'black')
      .style('stroke', function (d: any): any { return (color(d[key])); })
      .style('opacity', 0.5)
      .on('mouseover', highlight)
      .on('mouseleave', doNotHighlight);

    svg.selectAll('myAxis')
      .data(dimensions).enter()
      .append('g')
      .attr('transform', (d: any) => 'translate(' + x(d) + ')')
      .each(function (d: any) {
        d3.select(this).call(d3.axisLeft().ticks(5).scale(y[d]));
      })
      .append('text')
      .style('text-anchor', 'middle')
      .attr('y', 9)
      .text(function (d): any { return d; })
      .style('fill', 'black');

    setDraw(false);
  };

  const onSubmit = (file: File) => {
    const body = new FormData();
    body.append('files', file!);

    fetch('http://localhost:8000/parallel',
      {
        method: 'POST',
        body
      })
      .then(resp => resp.json())
      .then(resp => {
        setResp(resp);
        setNFeatures(resp.nonNumericFeatures);
      });
  };

  const handleClick = (value: any) => {
    if (displayColorPicker === value) {
      setDisplayColorPicker(undefined);
    } else {
      setDisplayColorPicker(value);
    }
  };

  const handleChangeColor = (value: any, index: number) => {
    const newColors: string[] = [...colors];
    newColors[index] = value.hex;
    setColors(newColors);
  };

  const handleMouseEnter = (item: any, color: string) => {
    d3.selectAll('.line')
      .transition().duration(200)
      .style('stroke', 'lightgrey')
      .style('opacity', '0.2');
    d3.selectAll('.' + getColorClass(item))
      .transition().duration(200)
      .style('stroke', color)
      .style('opacity', '1');
  };

  return (
    <>
      <SelectFile onSubmit={onSubmit} />
      <div className="row">
        {resp && (<>
          <div className="px-5 col-3">
            {renderFeatures()}
            <button
              className="btn btn-secondary mt-2"
              type="button"
              onClick={() => setDraw(true)}
            >Plot/Reset</button>
            {classes?.map((item: any, index: number) => {
              return (<div className="d-flex mt-2">
                <span>{item}:</span>
                <button
                  className="btn border mx-2"
                  onClick={() => handleClick(item)}
                  style={{ backgroundColor: colors[index] }}
                  type="button"
                  onMouseEnter={() => handleMouseEnter(item, colors[index])}
                >
                </button>
                <div>
                  {
                    displayColorPicker === item &&
                    <ChromePicker
                      color={colors[index]}
                      onChange={value => handleChangeColor(value, index)}
                    />}
                </div>
              </div>);
            })}
          </div>
          <div className="col-9 d-flex">
            <div className="mx-auto .bg-warning.bg-gradient">
              <svg ref={chart} />
            </div>
          </div>
        </>)}
      </div>
    </>
  );
}
