import React from 'react';
import { createRoot } from 'react-dom/client';

import a from '@/a.less?modules';
import b from '@/b.less?modules';

class App extends React.Component {
  render() {
    console.warn(a, b);
    return (
      <div className={a.app}>
        <h1 className={b.title}>Hello World</h1>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);
