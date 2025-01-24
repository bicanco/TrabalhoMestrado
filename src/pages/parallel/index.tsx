import * as d3 from 'd3';
import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChromePicker } from 'react-color';
import { useForm, useWatch } from 'react-hook-form';

import SelectFile from '@components/select-file/SelectFile';

export default function Parallel() {
  const chart = useRef<SVGSVGElement>(null);
  const { register, control, getValues, setValue } = useForm();
  const watch = useWatch({ control });
  const [colours, setColours] = useState<any[]>([]);
  const [nFeatures, setNFeatures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [resp, setResp] = useState<any>();
  const [displayColourPicker, setDisplayColourPicker] = useState<any>();
  const [draw, setDraw] = useState<boolean>();
  const [restrictions, setRestrictions] = useState<{ [key: string]: [number, number] | undefined; }>({});
  const [file, setFile] = useState<File>();
  const [showClassSelect, setShowClassSelect] = useState<boolean>();
  const [selectOptions, setSelectOptions] = useState<any>();

  useEffect(() => {
    const radio = getValues('radio');
    const selectedClass = getValues('selectedClass');
    if (!radio) {
      return;
    }
    const newClasses: any[] = selectedClass ? nFeatures?.find(item => item.feature === radio)?.[selectedClass] : nFeatures?.find(item => item.feature === radio)?.values;

    const length = newClasses.length;

    if (length && length < 1)
      return;
    const newColours: string[] = [];
    for (let i = 1; i <= length; i++) {
      newColours.push(d3.interpolateSinebow(i / length));
    }
    setColours(newColours);
    setClasses(newClasses);
  }, [watch]);

  useEffect(() => {
    if (draw) {
      drawChart();
    }
  }, [draw]);

  const renderFeatures = useCallback(() => {
    return nFeatures?.map((item: any, index: number) => {
      const name = item.feature;
      return (
        <div className='form-check' key={index}>
          <input className='form-check-input' type='radio' {...register('radio')} value={name} />
          <label className='form-check-label' htmlFor='flexRadioDefault1'>
            {name}
          </label>
        </div>
      );
    });
  }, [nFeatures]);

  const getColourClass = (selected: string) => {
    return `colour${classes.findIndex((item) => item === selected)}`;
  };

  const getColourScale = () => {
    const radio = getValues('radio');
    const dimensions = resp.nonNumericFeatures.find((item: any) => item.feature === radio).values;
    return d3.scaleOrdinal()
      .domain(dimensions)
      .range(colours);
  };

  const drawChart = () => {
    const width = 500;
    const features = resp.numericFeatures;
    const height = 125 * features.length;
    const margin = 20;
    const svg = d3.select(chart.current);
    const radio = getValues('radio');
    const selectedClass = getValues('selectedClass')
    const data = resp!.data.filter((d: any) => !selectedClass || d.Class === selectedClass);
    svg.selectAll('*').remove();

    svg
      .attr('width', width + 2 * margin)
      .attr('height', height + 2 * margin)
      .append('g')
      .attr('transform',
        'translate(' + margin + ',' + margin + ')');


    const dimensions = features.map((feature: any) => feature.feature);

    const colour = d3.scaleOrdinal()
      .domain(resp.nonNumericFeatures.find((item: any) => item.feature === radio).values)
      .range(colours);

    const y: { [key: string]: any; } = {};
    features.forEach((item: any) => {
      let max;
      let min;
      if (selectedClass) {
        max = item[selectedClass].max
        min = item[selectedClass].min
      } else {
        const keys = Object.keys(item).filter(key => key !== 'feature');
        max = keys.reduce((prev, curr) => item[curr].max > prev ? item[curr].max : prev, item[keys[0]].max);
        min = keys.reduce((prev, curr) => item[curr].min < prev ? item[curr].min : prev, item[keys[0]].min);
      }
      const name = item.feature;
      y[name] = d3.scaleLinear()
        .domain([min, max])
        .range([height - margin, margin]).nice();
    });

    const x = d3.scalePoint()
      .range([margin, width - margin])
      .domain(dimensions);

    const path = (d: any) => {
      return d3.line()(dimensions.map((p: any): any => { return [x(p), y[p](d[p])]; }));
    };

    svg.selectAll('myPath')
      .data(data)
      .enter()
      .append('path')
      .attr('class', function (d: any) { return 'line ' + getColourClass(d[radio]); })
      .attr('d', path)
      .style('fill', 'none')
      .style('stroke', 'black')
      .style('stroke', function (d: any): any { return (colour(d[radio])); })
      .style('opacity', 0.5);

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
              let isInRange = true;
              Object.keys(restr).forEach((item) => {
                const [y0, y1] = restr[item]!;
                const coord = y[item](d[item]);
                isInRange &&= y0 <= coord && coord <= y1;
              });
              return isInRange;
            })
            .raise()
            .transition().duration(200)
            .style('stroke', (d: any): any => { return (colour(d[radio])); })
            .style('opacity', '1')

          d3.selectAll('.axis')
            .raise()
        }) as any);

    setDraw(false);
  };

  const onSubmit = (file: File) => {
    const body = new FormData();
    setFile(file);
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
        const nonNumericFeatures = resp.nonNumericFeatures.find((item: any) => item.feature === 'Class');
        if(nonNumericFeatures?.values.length > 1) {
          setValue('selectedClass', '')
          setShowClassSelect(true);
          setSelectOptions(nonNumericFeatures.values);
        } else {
          setValue('selectedClass', nonNumericFeatures.values[0])
          setShowClassSelect(false);
        }
      });
  };

  const handleClick = (value: any) => {
    if (displayColourPicker === value) {
      setDisplayColourPicker(undefined);
    } else {
      setDisplayColourPicker(value);
    }
  };

  const handleChangeColour = (value: any, index: number) => {
    const newColours: string[] = [...colours];
    newColours[index] = value.hex;
    setColours(newColours);
    d3.selectAll(`.colour${index}`)
      .style('stroke', value.hex)
  };

  const handleHighlightClass = (item: any, colour: string) => {
    d3.selectAll('.line')
      .transition().duration(200)
      .style('stroke', 'lightgrey')
      .style('opacity', '0.2');
    d3.selectAll('.' + getColourClass(item))
      .raise()
      .transition().duration(200)
      .style('stroke', colour)
      .style('opacity', '1');
    d3.selectAll('.axis')
      .raise()
      .call(d3.brushY().clear as any);
  };

  const handleHighlightAll = () => {
    const colourScale = getColourScale();
    const radio = getValues('radio')
    d3.selectAll('.line')
      .transition().duration(200)
      .style('stroke', (d: any): any => colourScale(d[radio]))
      .style('opacity', 0.5);

    d3.selectAll('.axis')
      .call(d3.brushY().clear as any)
  };

  const handleExportColours = () => {
    const body = new FormData();
    const fieldValue = colours.map((colour, index) => ([classes[index], colour]))
    body.append('files', file!);
    body.append('colours', JSON.stringify(fieldValue));
    body.append('key', getValues('radio'))
    fetch('http://localhost:8000/colours',
      {
        method: 'POST',
        body
      })
      .then(resp => resp.blob())
      .then(resp => {
        const url = window.URL.createObjectURL(new Blob([resp]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file!.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
  };

  return (
    <>
      <Head>
        <title>VT-EAA: Parallel plot</title>
      </Head>
      <SelectFile onSubmit={onSubmit} />
      {showClassSelect &&
        <div className='m-3'>
          <label htmlFor='class' className='form-label'>Select class</label>
          <select id='class' className='form-select' {...register('selectedClass')}>
            <option value=''>All classes</option>
            {selectOptions.map((option: string, index: number) =>
              <option value={option} key={index}>{option}</option>
            )}
          </select>
        </div>
      }
      <div className='row'>
        {resp && (<>
          <div className='px-5 col-3'>
            {renderFeatures()}
            <div className='d-flex flex-column'>
              <button
                className='btn btn-secondary mt-2'
                type='button'
                onClick={() => setDraw(true)}
              >Plot</button>
              <button
                className='btn btn-light border'
                type='button'
                onClick={() => handleHighlightAll()}
              >Highlight all</button>
              <button
                className='btn btn-light border'
                type='button'
                onClick={() => handleExportColours()}
              >Export colours</button>
            </div>
            {classes?.map((item: any, index: number) => {
              return (<div className='d-flex mt-2' key={index}>
                <button
                  className='btn btn-light'
                  type='button'
                  onClick={() => handleHighlightClass(item, colours[index])}
                >
                  {item}:
                </button>
                <button
                  className='btn border mx-2'
                  onClick={() => handleClick(item)}
                  style={{ backgroundColor: colours[index] }}
                  type='button'
                >
                </button>
                <div>
                  {
                    displayColourPicker === item &&
                    <ChromePicker
                      color={colours[index]}
                      onChange={value => handleChangeColour(value, index)}
                    />}
                </div>
              </div>);
            })}
          </div>
          <div className='col-9 d-flex'>
            <div className='mx-auto'>
              <svg ref={chart} />
            </div>
          </div>
        </>)}
      </div>
    </>
  );
}
