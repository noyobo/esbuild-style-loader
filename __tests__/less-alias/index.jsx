import React from 'react';
import { createRoot } from 'react-dom/client';

import * as a from '@/a.less?modules';
import b from '@/a.less?modules';

class App extends React.Component {
  render() {
    console.warn(a, b);
    return (
      <div className={a.app}>
        <h1 className={a['app-title']}>Hello World</h1>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);
