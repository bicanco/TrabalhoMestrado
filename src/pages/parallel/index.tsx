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
  const [restrictions, setRestrictions] = useState<{ [key: string]: [number, number] | undefined; }>({});

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
    for (let i = 1; i <= length; i++) {
      newColors.push(d3.interpolateSinebow(i / length));
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
    const radio = getValues('radio');
    const dimensions = resp.nonNumericFeatures.find((item: any) => item.feature === radio).values;
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
    const radio = getValues('radio');
    const data = resp!.data;
    svg.selectAll('*').remove();

    svg
      .attr('width', width + 2 * margin)
      .attr('height', height + 2 * margin)
      .append('g')
      .attr('transform',
        'translate(' + margin + ',' + margin + ')');


    const dimensions = features.map((feature: any) => feature.feature);
    // const dimensions = resp.nonNumericFeatures.find((item: any) => item.feature === radio).values;

    const color = d3.scaleOrdinal()
      .domain(resp.nonNumericFeatures.find((item: any) => item.feature === radio).values)
      .range(colors);

    const y: { [key: string]: any; } = {};
    features.forEach((item: any) => {
      const name = item.feature;
      y[name] = d3.scaleLinear()
        .domain([item.min, item.max])
        .range([height - margin, margin]).nice();
    });

    const x = d3.scalePoint()
      .range([margin, width - margin])
      .domain(dimensions);

    const path = (d: any) => {
      return d3.line()(dimensions.map((p: any): any => { return [x(p), y[p](d[p])]; }));
    };

    // const highlight = function (_event: any, d: any) {
    //   const selected_data = d[key];

    //   d3.selectAll('.line')
    //     .transition().duration(200)
    //     .style('stroke', 'lightgrey')
    //     .style('opacity', '0.2');
    //   d3.selectAll('.' + getColorClass(selected_data))
    //     .transition().duration(200)
    //     .style('stroke', color(selected_data) as any)
    //     .style('opacity', '1');
    // };

    // const doNotHighlight = function (): any {
    //   d3.selectAll('.line')
    //     .transition().duration(200).delay(1000)
    //     .style('stroke', function (d: any): any { return (color(d[key])); })
    //     .style('opacity', '1');
    // };

    svg.selectAll('myPath')
      .data(data)
      .enter()
      .append('path')
      .attr('class', function (d: any) { return 'line ' + getColorClass(d[radio]); })
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', 'black')
      .style('stroke', function (d: any): any { return (color(d[radio])); })
      .style('opacity', 0.5);
    // .on('mouseover', highlight)
    // .on('mouseleave', doNotHighlight);

    svg.selectAll('myAxis')
      .data(dimensions).enter()
      .append('g')
      .attr('transform', (d: any) => 'translate(' + x(d) + ')')
      .attr('class', 'axis')
      .each(function (d: any) {
        d3.select(this)
          .call(d3.axisLeft().scale(y[d]));
      })
      .append('text')
      .style('text-anchor', 'middle')
      .attr('y', 9)
      .text(function (d): any { return d; })
      .style('fill', 'black');

    svg.selectAll('.axis').call(
      d3.brushY()
        .extent([[-25, margin], [25, height - margin]])
        .on('start brush end', ({ selection }, key: any) => {
          const restr = restrictions;
          if (!selection) {
            delete restr[key];
          } else {
            restr[key] = selection;
          }
          setRestrictions(restr);

          d3.selectAll('.line')
            .transition().duration(200)
            .style('stroke', 'lightgrey')
            .style('opacity', '0.2');

          d3.selectAll('.line')
            .filter((d: any) => {
              if (!d) return false;
              let aux = true;
              Object.keys(restr).forEach((item) => {
                const [y0, y1] = restr[item]!;
                const coord = y[item](d[item]);
                aux &&= y0 <= coord && coord <= y1;
              });
              return aux;
            })
            .raise()
            .transition().duration(200)
            .style('stroke', (d: any): any => { return (color(d[radio])); })
            .style('opacity', '1')

          d3.selectAll('.axis')
            .raise()
        }) as any);

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
    d3.selectAll(`.color${index}`)
      .style('stroke', value.hex)
  };

  const handleHighlightClass = (item: any, color: string) => {
    d3.selectAll('.line')
      .transition().duration(200)
      .style('stroke', 'lightgrey')
      .style('opacity', '0.2');
    d3.selectAll('.' + getColorClass(item))
      .raise()
      .transition().duration(200)
      .style('stroke', color)
      .style('opacity', '1');
    d3.selectAll('.axis')
      .raise()
      .call(d3.brushY().clear as any);
  };

  const handleHighlightAll = () => {
    const colorScale = getColorScale();
    const radio = getValues('radio')
    d3.selectAll('.line')
      .transition().duration(200)
      .style('stroke', (d: any): any => colorScale(d[radio]))
      .style('opacity', 0.5);

    d3.selectAll('.axis')
      .call(d3.brushY().clear as any)
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
            >Plot</button>
            <button
              className="btn btn-light"
              type="button"
              onClick={() => handleHighlightAll()}
            >Highlight all</button>
            {classes?.map((item: any, index: number) => {
              return (<div className="d-flex mt-2">
                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => handleHighlightClass(item, colors[index])}
                >
                  {item}:
                </button>
                <button
                  className="btn border mx-2"
                  onClick={() => handleClick(item)}
                  style={{ backgroundColor: colors[index] }}
                  type="button"
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
            <div className="mx-auto">
              <svg ref={chart} />
            </div>
          </div>
        </>)}
      </div>
    </>
  );
}
