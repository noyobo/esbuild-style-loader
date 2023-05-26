import React from 'react';
import { createRoot } from 'react-dom/client';

import a from '@/a.less?modules';

import { Foo } from './foo';

class App extends React.Component {
  render() {
    console.warn(a, b);
    return (
      <div className={a.app}>
        <Foo />
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);
